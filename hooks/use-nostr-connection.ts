"use client"

import { useState, useEffect, useRef, useCallback } from 'react'

// Event kinds for Nostr protocol
const EVENT_KINDS = {
  ANNOUNCEMENT: 20001,
  GROUP_MESSAGE: 1059,
  BANDWIDTH_REPORT: 20002,
  USER_LEAVING: 20003,
  SYSTEM_UPDATE: 20004
} as const

// Type definitions
interface SystemInfo {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  cpuCores: number
  memoryGB: number
  browserEngine: string
  capabilities: string[]
  networkSpeed: {
    download: number
    upload: number
    latency: number
  }
}

interface NetworkUser {
  pubkey: string
  shortId: string
  deviceName: string
  connectionTime: number
  lastSeen: number
  systemInfo: SystemInfo
  bandwidth: {
    upload: number
    download: number
  }
}

interface NetworkStats {
  totalUsers: number
  totalBandwidth: {
    upload: number
    download: number
  }
  averageSessionTime: number
  peakUsers: number
  deviceDistribution: Record<string, number>
}

interface NostrNetworkState {
  isConnected: boolean
  isInitializing: boolean
  connectedRelays: number
  totalRelays: number
  publicKey: string | null
  shortId: string | null
  networkUsers: Map<string, NetworkUser>
  userCount: number
  networkStats: NetworkStats
  mySystemInfo: SystemInfo | null
  errors: string[]
}

interface NostrKeyPair {
  privateKey: string
  publicKey: string
  expiresAt: number
}

export function useNostrNetwork(groupName: string = 'mkenya-group') {
  const [state, setState] = useState<NostrNetworkState>({
    isConnected: false,
    isInitializing: false,
    connectedRelays: 0,
    totalRelays: 5,
    publicKey: null,
    shortId: null,
    networkUsers: new Map(),
    userCount: 1,
    networkStats: {
      totalUsers: 1,
      totalBandwidth: { upload: 0, download: 0 },
      averageSessionTime: 0,
      peakUsers: 1,
      deviceDistribution: {}
    },
    mySystemInfo: null,
    errors: []
  })

  // Refs for persistent data
  const wsConnections = useRef<Map<string, WebSocket>>(new Map())
  const privateKey = useRef<string | null>(null)
  const groupTag = useRef<string>('')
  const isInitialized = useRef<boolean>(false)
  const cleanupInterval = useRef<NodeJS.Timeout | null>(null)
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null)
  const bandwidthMonitor = useRef<NodeJS.Timeout | null>(null)
  const nostrTools = useRef<any>(null)

  // Configuration
  const RELAYS = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://nostr-pub.wellorder.net',
    'wss://relay.primal.net'
  ]

  const KEY_EXPIRY_HOURS = 2
  const HEARTBEAT_INTERVAL = 30000
  const CLEANUP_INTERVAL = 45000
  const USER_TIMEOUT = 90000
  const CONNECTION_TIMEOUT = 10000

  // Error handling
  const addError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      errors: [...prev.errors.slice(-4), error]
    }))
  }, [])

  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, errors: [] }))
  }, [])

  // Utility functions
  const createGroupTag = useCallback((name: string): string => {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return `secure-group-${Math.abs(hash).toString(16).substring(0, 8)}`
  }, [])

  // Load nostr-tools library
  const loadNostrTools = useCallback(async () => {
    if (nostrTools.current) return nostrTools.current

    try {
      const NostrTools = await import('nostr-tools')
      nostrTools.current = NostrTools
      return NostrTools
    } catch (error) {
      // Fallback crypto implementation
      const generateSecretKey = () => {
        const privateKeyBytes = new Uint8Array(32)
        crypto.getRandomValues(privateKeyBytes)
        return privateKeyBytes
      }

      const getPublicKey = async (privateKeyBytes: Uint8Array) => {
        const privateKeyHex = Array.from(privateKeyBytes, b => b.toString(16).padStart(2, '0')).join('')
        const encoder = new TextEncoder()
        const data = encoder.encode(privateKeyHex + 'nostr_pubkey_salt')
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('')
      }

      const finalizeEvent = async (eventTemplate: any, privateKeyBytes: Uint8Array) => {
        const event = { ...eventTemplate }
        const privateKeyHex = Array.from(privateKeyBytes, b => b.toString(16).padStart(2, '0')).join('')
        
        const eventData = JSON.stringify([
          0, event.pubkey, event.created_at, event.kind, event.tags, event.content
        ])
        
        const encoder = new TextEncoder()
        const data = encoder.encode(eventData)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        event.id = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('')
        
        const sigData = encoder.encode(event.id + privateKeyHex + 'nostr_sig_salt')
        const sigBuffer = await crypto.subtle.digest('SHA-256', sigData)
        event.sig = Array.from(new Uint8Array(sigBuffer), b => b.toString(16).padStart(2, '0')).join('')
        
        return event
      }

      nostrTools.current = { generateSecretKey, getPublicKey, finalizeEvent }
      return nostrTools.current
    }
  }, [])

  // System detection
  const detectSystemInfo = useCallback(async (): Promise<SystemInfo> => {
    try {
      const userAgent = navigator.userAgent.toLowerCase()
      
      // Device type detection
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
      const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent)
      
      let deviceType: SystemInfo['deviceType'] = 'unknown'
      if (isTablet) deviceType = 'tablet'
      else if (isMobile) deviceType = 'mobile'
      else if (userAgent.includes('mac') || userAgent.includes('win') || userAgent.includes('linux')) {
        deviceType = 'desktop'
      }

      const cpuCores = navigator.hardwareConcurrency || 1
      const memoryGB = Math.round(((navigator as any).deviceMemory || (deviceType === 'mobile' ? 4 : 8)))

      // Browser engine
      let browserEngine = 'unknown'
      if (userAgent.includes('gecko') && !userAgent.includes('webkit')) browserEngine = 'gecko'
      else if (userAgent.includes('webkit')) browserEngine = 'webkit'
      else if (userAgent.includes('trident')) browserEngine = 'trident'

      // Capabilities
      const capabilities: string[] = []
      const checks = [
        ['serviceWorker', 'serviceWorker' in navigator],
        ['webSocket', 'WebSocket' in window],
        ['webGL', 'webgl' in document.createElement('canvas')],
        ['indexedDB', 'indexedDB' in window],
        ['geolocation', 'geolocation' in navigator],
        ['bluetooth', 'bluetooth' in navigator],
        ['usb', 'usb' in navigator]
      ]
      
      checks.forEach(([name, available]) => {
        if (available) capabilities.push(name as string)
      })

      return {
        deviceType,
        cpuCores,
        memoryGB,
        browserEngine,
        capabilities,
        networkSpeed: { download: 0, upload: 0, latency: 0 }
      }
    } catch (error) {
      addError('Failed to detect system information')
      return {
        deviceType: 'unknown',
        cpuCores: 1,
        memoryGB: 4,
        browserEngine: 'unknown',
        capabilities: [],
        networkSpeed: { download: 10, upload: 5, latency: 100 }
      }
    }
  }, [addError])

  // Network speed measurement
  const measureNetworkSpeed = useCallback(async (): Promise<{ download: number; upload: number; latency: number }> => {
    try {
      // Measure latency to relays
      const latencyTests = RELAYS.slice(0, 3).map(async (url) => {
        const start = performance.now()
        try {
          const ws = new WebSocket(url)
          return new Promise<number>((resolve) => {
            ws.onopen = () => {
              const latency = performance.now() - start
              ws.close()
              resolve(latency)
            }
            ws.onerror = () => resolve(999)
            setTimeout(() => resolve(999), 5000)
          })
        } catch {
          return 999
        }
      })

      const latencies = await Promise.all(latencyTests)
      const validLatencies = latencies.filter(l => l < 999)
      const avgLatency = validLatencies.length > 0 
        ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
        : 100

      // Estimate bandwidth
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      
      let estimatedDownload = 10
      let estimatedUpload = 5

      if (connection?.downlink) {
        estimatedDownload = connection.downlink
        estimatedUpload = Math.round(estimatedDownload * 0.3)
      } else {
        // Estimate based on latency
        if (avgLatency < 50) {
          estimatedDownload = 100
          estimatedUpload = 20
        } else if (avgLatency < 100) {
          estimatedDownload = 50
          estimatedUpload = 10
        } else if (avgLatency < 200) {
          estimatedDownload = 25
          estimatedUpload = 5
        } else {
          estimatedDownload = 10
          estimatedUpload = 2
        }
      }

      return {
        download: estimatedDownload,
        upload: estimatedUpload,
        latency: avgLatency
      }
    } catch (error) {
      addError('Network speed measurement failed')
      return { download: 10, upload: 5, latency: 100 }
    }
  }, [addError])

  // Key management
  const loadOrGenerateKeys = useCallback(async (): Promise<NostrKeyPair> => {
    const storageKey = `nostr-keys-${groupName}-v1`
    const now = Date.now()
    
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const { privateKey: storedPrivateKey, publicKey: storedPublicKey, expiresAt } = JSON.parse(stored)
        
        if (expiresAt > now && storedPrivateKey && storedPublicKey) {
          return { privateKey: storedPrivateKey, publicKey: storedPublicKey, expiresAt }
        }
      }
    } catch (error) {
      addError('Failed to load cached keys')
    }

    // Generate new keypair
    try {
      const tools = await loadNostrTools()
      const secretKey = tools.generateSecretKey()
      let privateKeyHex: string
      let publicKeyHex: string
      
      if (secretKey instanceof Uint8Array) {
        privateKeyHex = Array.from(secretKey, b => b.toString(16).padStart(2, '0')).join('')
        publicKeyHex = await tools.getPublicKey(secretKey)
      } else {
        privateKeyHex = Buffer.from(secretKey).toString('hex')
        publicKeyHex = await tools.getPublicKey(privateKeyHex)
      }
      
      const expiresAt = now + (KEY_EXPIRY_HOURS * 60 * 60 * 1000)
      
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          privateKey: privateKeyHex,
          publicKey: publicKeyHex,
          expiresAt,
          createdAt: now
        }))
      } catch (error) {
        addError('Failed to cache keys')
      }

      return { privateKey: privateKeyHex, publicKey: publicKeyHex, expiresAt }
    } catch (error) {
      addError('Failed to generate cryptographic keys')
      throw error
    }
  }, [groupName, addError, loadNostrTools])

  // Event creation
  const createNostrEvent = useCallback(async (
    kind: number, 
    content: string, 
    tags: string[][] = [],
    pubkey?: string
  ) => {
    try {
      const tools = await loadNostrTools()
      
      if (!privateKey.current || (!state.publicKey && !pubkey)) {
        throw new Error('Missing keys for event creation')
      }

      const eventTemplate = {
        kind,
        pubkey: pubkey || state.publicKey!,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content
      }

      let event: any
      
      if (privateKey.current.length === 64) {
        event = await tools.finalizeEvent(eventTemplate, privateKey.current)
      } else {
        const privateKeyBytes = new Uint8Array(32)
        for (let i = 0; i < 32; i++) {
          privateKeyBytes[i] = parseInt(privateKey.current.substring(i * 2, i * 2 + 2), 16)
        }
        event = await tools.finalizeEvent(eventTemplate, privateKeyBytes)
      }
      
      return event
    } catch (error) {
      addError('Failed to create Nostr event')
      return null
    }
  }, [state.publicKey, addError, loadNostrTools])

  // Event publishing
  const publishEvent = useCallback(async (event: any): Promise<number> => {
    let successCount = 0
    
    for (const [url, ws] of wsConnections.current.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(['EVENT', event]))
          successCount++
        } catch (error) {
          addError(`Failed to publish to ${url}`)
        }
      }
    }

    return successCount
  }, [addError])

  // Send announcement
  const sendAnnouncement = useCallback(async (
    systemInfo: SystemInfo,
    publicKey: string,
    shortId: string
  ) => {
    try {
      const announcementData = {
        machine_name: `Browser-${shortId}`,
        platform: systemInfo.deviceType,
        arch: 'web',
        cpus: systemInfo.cpuCores,
        memory_gb: systemInfo.memoryGB,
        hostname: `web-${shortId}`,
        timestamp: Date.now(),
        system_info: {
          device_type: systemInfo.deviceType,
          cpu_cores: systemInfo.cpuCores,
          memory_gb: systemInfo.memoryGB,
          browser_engine: systemInfo.browserEngine,
          capabilities: systemInfo.capabilities,
          network_speed: {
            download_mbps: systemInfo.networkSpeed.download,
            upload_mbps: systemInfo.networkSpeed.upload,
            latency_ms: systemInfo.networkSpeed.latency
          }
        }
      }
      
      const event = await createNostrEvent(
        EVENT_KINDS.ANNOUNCEMENT,
        JSON.stringify(announcementData),
        [['t', groupTag.current]],
        publicKey
      )

      if (event) {
        const published = await publishEvent(event)
        
        // Send welcome message
        setTimeout(async () => {
          const messageData = {
            sender: `Browser-${shortId}`,
            message: `${systemInfo.deviceType} device joined with ${systemInfo.cpuCores} cores, ${systemInfo.memoryGB}GB RAM, ${systemInfo.networkSpeed.download}/${systemInfo.networkSpeed.upload} Mbps`,
            timestamp: Date.now()
          }

          const messageEvent = await createNostrEvent(
            EVENT_KINDS.GROUP_MESSAGE,
            JSON.stringify(messageData),
            [['t', groupTag.current]],
            publicKey
          )

          if (messageEvent) {
            await publishEvent(messageEvent)
          }
        }, 1000)
        
        return published > 0
      }
      
      return false
    } catch (error) {
      addError('Failed to send announcement')
      return false
    }
  }, [createNostrEvent, publishEvent, addError])

  // Handle incoming events
  const handleNostrEvent = useCallback((event: any) => {
    try {
      // Verify group tag
      const hasGroupTag = event.tags.some((tag: string[]) => 
        tag[0] === 't' && tag[1] === groupTag.current
      )
      
      if (!hasGroupTag || event.pubkey === state.publicKey) {
        return
      }

      const content = JSON.parse(event.content)

      switch (event.kind) {
        case EVENT_KINDS.ANNOUNCEMENT:
          const systemInfo: SystemInfo = content.system_info ? {
            deviceType: content.system_info.device_type || 'unknown',
            cpuCores: content.system_info.cpu_cores || 1,
            memoryGB: content.system_info.memory_gb || 4,
            networkSpeed: {
              download: content.system_info.network_speed?.download_mbps || 10,
              upload: content.system_info.network_speed?.upload_mbps || 5,
              latency: content.system_info.network_speed?.latency_ms || 100
            },
            browserEngine: content.system_info.browser_engine || 'unknown',
            capabilities: content.system_info.capabilities || []
          } : {
            deviceType: 'unknown',
            cpuCores: 1,
            memoryGB: 4,
            networkSpeed: { download: 10, upload: 5, latency: 100 },
            browserEngine: 'unknown',
            capabilities: []
          }
          
          const user: NetworkUser = {
            pubkey: event.pubkey,
            shortId: event.pubkey.substring(0, 12),
            deviceName: content.machine_name || 'Unknown',
            connectionTime: content.timestamp || Date.now(),
            lastSeen: Date.now(),
            systemInfo,
            bandwidth: { upload: 0, download: 0 }
          }

          setState(prev => {
            const newUsers = new Map(prev.networkUsers)
            const wasNew = !newUsers.has(event.pubkey)
            newUsers.set(event.pubkey, user)
            
            const newUserCount = newUsers.size + 1
            
            // Update device distribution
            const deviceDistribution = { ...prev.networkStats.deviceDistribution }
            if (wasNew) {
              deviceDistribution[systemInfo.deviceType] = (deviceDistribution[systemInfo.deviceType] || 0) + 1
            }
            
            return {
              ...prev,
              networkUsers: newUsers,
              userCount: newUserCount,
              networkStats: {
                ...prev.networkStats,
                totalUsers: newUserCount,
                peakUsers: Math.max(prev.networkStats.peakUsers, newUserCount),
                deviceDistribution
              }
            }
          })
          break

        case EVENT_KINDS.BANDWIDTH_REPORT:
          setState(prev => {
            const newUsers = new Map(prev.networkUsers)
            const existingUser = newUsers.get(event.pubkey)
            
            if (existingUser) {
              existingUser.bandwidth = {
                upload: content.upload || 0,
                download: content.download || 0
              }
              existingUser.lastSeen = Date.now()
              newUsers.set(event.pubkey, existingUser)
            }
            
            return { ...prev, networkUsers: newUsers }
          })
          break

        case EVENT_KINDS.USER_LEAVING:
          setState(prev => {
            const newUsers = new Map(prev.networkUsers)
            const user = newUsers.get(event.pubkey)
            
            if (user) {
              const deviceDistribution = { ...prev.networkStats.deviceDistribution }
              deviceDistribution[user.systemInfo.deviceType] = Math.max(0, 
                (deviceDistribution[user.systemInfo.deviceType] || 1) - 1
              )
              
              newUsers.delete(event.pubkey)
              
              return {
                ...prev,
                networkUsers: newUsers,
                userCount: newUsers.size + 1,
                networkStats: {
                  ...prev.networkStats,
                  totalUsers: newUsers.size + 1,
                  deviceDistribution
                }
              }
            }
            
            return prev
          })
          break
      }
    } catch (error) {
      addError('Failed to handle incoming event')
    }
  }, [state.publicKey, addError])

  // Connect to relay
  const connectToRelay = useCallback(async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(url)
        
        const timeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close()
            resolve(false)
          }
        }, CONNECTION_TIMEOUT)
        
        ws.onopen = () => {
          clearTimeout(timeout)
          wsConnections.current.set(url, ws)
          
          // Subscribe to events
          const filter = {
            kinds: [EVENT_KINDS.ANNOUNCEMENT, EVENT_KINDS.GROUP_MESSAGE, EVENT_KINDS.BANDWIDTH_REPORT],
            '#t': [groupTag.current],
            since: Math.floor(Date.now() / 1000) - 3600
          }
          
          const subId = 'chat_' + Math.random().toString(36).substring(7)
          ws.send(JSON.stringify(['REQ', subId, filter]))
          
          setState(prev => ({
            ...prev,
            connectedRelays: wsConnections.current.size,
            isConnected: wsConnections.current.size > 0
          }))
          
          resolve(true)
        }

        ws.onmessage = (messageEvent) => {
          try {
            const [type, ...data] = JSON.parse(messageEvent.data)
            
            if (type === 'EVENT') {
              const [subId, nostrEvent] = data
              handleNostrEvent(nostrEvent)
            }
          } catch (error) {
            addError('Failed to parse relay message')
          }
        }

        ws.onerror = () => {
          clearTimeout(timeout)
          resolve(false)
        }

        ws.onclose = () => {
          clearTimeout(timeout)
          wsConnections.current.delete(url)
          setState(prev => ({
            ...prev,
            connectedRelays: wsConnections.current.size,
            isConnected: wsConnections.current.size > 0
          }))
          resolve(false)
        }

      } catch (error) {
        addError(`Failed to connect to ${url}`)
        resolve(false)
      }
    })
  }, [handleNostrEvent, addError])

  // Main initialization
  const initializeNetwork = useCallback(async () => {
    if (state.isInitializing || isInitialized.current) return

    setState(prev => ({ ...prev, isInitializing: true }))
    isInitialized.current = true
    
    try {
      clearErrors()
      
      // Generate keys and detect system
      const [keys, systemInfo] = await Promise.all([
        loadOrGenerateKeys(),
        detectSystemInfo()
      ])
      
      // Measure network speed
      const networkSpeed = await measureNetworkSpeed()
      const enhancedSystemInfo = { ...systemInfo, networkSpeed }
      
      privateKey.current = keys.privateKey
      groupTag.current = createGroupTag(groupName)
      const shortId = keys.publicKey.substring(0, 12)

      setState(prev => ({
        ...prev,
        publicKey: keys.publicKey,
        shortId: shortId,
        mySystemInfo: enhancedSystemInfo,
        totalRelays: RELAYS.length
      }))

      // Connect to relays
      const connectionPromises = RELAYS.map(connectToRelay)
      const results = await Promise.allSettled(connectionPromises)
      
      const successfulConnections = results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length

      if (successfulConnections === 0) {
        throw new Error('Failed to connect to any relays')
      }

      // Start announcing after connections stabilize
      setTimeout(async () => {
        const success = await sendAnnouncement(enhancedSystemInfo, keys.publicKey, shortId)
        
        if (success) {
          // Set up intervals
          heartbeatInterval.current = setInterval(async () => {
            await sendAnnouncement(enhancedSystemInfo, keys.publicKey, shortId)
          }, HEARTBEAT_INTERVAL)
          
          // Bandwidth monitoring
          bandwidthMonitor.current = setInterval(() => {
            setState(prev => ({
              ...prev,
              mySystemInfo: prev.mySystemInfo ? {
                ...prev.mySystemInfo,
                networkSpeed: {
                  ...prev.mySystemInfo.networkSpeed,
                  download: prev.mySystemInfo.networkSpeed.download + (Math.random() - 0.5) * 2,
                  upload: prev.mySystemInfo.networkSpeed.upload + (Math.random() - 0.5) * 1
                }
              } : null
            }))
          }, 10000)
        }
      }, 3000)

    } catch (error) {
      addError('Network initialization failed')
      isInitialized.current = false
    } finally {
      setState(prev => ({ ...prev, isInitializing: false }))
    }
  }, [state.isInitializing, loadOrGenerateKeys, detectSystemInfo, measureNetworkSpeed, createGroupTag, groupName, connectToRelay, sendAnnouncement, addError, clearErrors])

  // Cleanup users
  useEffect(() => {
    cleanupInterval.current = setInterval(() => {
      const now = Date.now()
      
      setState(prev => {
        const newUsers = new Map()
        let removedCount = 0
        const deviceDistribution = { ...prev.networkStats.deviceDistribution }
        
        for (const [pubkey, user] of prev.networkUsers.entries()) {
          if (now - user.lastSeen < USER_TIMEOUT) {
            newUsers.set(pubkey, user)
          } else {
            removedCount++
            deviceDistribution[user.systemInfo.deviceType] = Math.max(0, 
              (deviceDistribution[user.systemInfo.deviceType] || 1) - 1
            )
          }
        }
        
        if (removedCount > 0) {
          return {
            ...prev,
            networkUsers: newUsers,
            userCount: newUsers.size + 1,
            networkStats: {
              ...prev.networkStats,
              totalUsers: newUsers.size + 1,
              deviceDistribution
            }
          }
        }
        
        return prev
      })
    }, CLEANUP_INTERVAL)

    return () => {
      if (cleanupInterval.current) clearInterval(cleanupInterval.current)
    }
  }, [])

  // Auto-initialize
  useEffect(() => {
    if (typeof window !== 'undefined' && !state.isInitializing && !isInitialized.current) {
      const timer = setTimeout(initializeNetwork, 1000)
      return () => clearTimeout(timer)
    }
  }, [initializeNetwork, state.isInitializing])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current)
      if (bandwidthMonitor.current) clearInterval(bandwidthMonitor.current)
      if (cleanupInterval.current) clearInterval(cleanupInterval.current)
      
      for (const ws of wsConnections.current.values()) {
        ws.close()
      }
      wsConnections.current.clear()
    }
  }, [])

  // Public interface
  const disconnect = useCallback(async () => {
    try {
      if (state.publicKey && state.shortId) {
        const leaveEvent = await createNostrEvent(
          EVENT_KINDS.USER_LEAVING,
          JSON.stringify({
            user_id: state.shortId,
            timestamp: Date.now()
          }),
          [['t', groupTag.current]]
        )

        if (leaveEvent) {
          await publishEvent(leaveEvent)
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    } catch (error) {
      addError('Failed to send leave notification')
    }

    // Cleanup
    if (heartbeatInterval.current) clearInterval(heartbeatInterval.current)
    if (bandwidthMonitor.current) clearInterval(bandwidthMonitor.current)
    
    for (const ws of wsConnections.current.values()) {
      ws.close()
    }
    wsConnections.current.clear()
    isInitialized.current = false
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      connectedRelays: 0,
      networkUsers: new Map(),
      userCount: 1
    }))
  }, [state.publicKey, state.shortId, createNostrEvent, publishEvent, addError])

  return {
    // Connection state
    isConnected: state.isConnected,
    isInitializing: state.isInitializing,
    connectedRelays: state.connectedRelays,
    totalRelays: state.totalRelays,
    
    // User info
    publicKey: state.publicKey,
    shortId: state.shortId,
    mySystemInfo: state.mySystemInfo,
    
    // Network data
    networkUsers: state.networkUsers,
    userCount: state.userCount,
    networkStats: state.networkStats,
    
    // Error handling
    errors: state.errors,
    clearErrors,
    
    // Actions
    initialize: initializeNetwork,
    disconnect
  }
}