// app/dashboard/page.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { GlassCard } from "@/components/glass-card"
import { SpeedGauge } from "@/components/speed-gauge"
import { ThemeToggle } from "@/components/theme-toggle"
import { NostrStatus } from "@/components/nostr-status"
import { ResponsiveButton } from "@/components/responsive-button"
import { Progress } from "@/components/ui/progress"
import {
  Play,
  Pause,
  Square,
  Download,
  Trash2,
  Settings,
  Globe,
  Clock,
  TrendingUp,
  Shield,
  Cpu,
  Network,
  Home,
  User,
  Wifi,
  AlertTriangle,
  Activity
} from "lucide-react"
import Link from "next/link"
import { SystemMonitor } from "@/components/system-monitor"

// Import components
import { TargetManagement } from "./components/target-management"
import { Layer7Config } from "./components/layer7-config"
import { Layer4Config } from "./components/layer4-config"
import { ResultsPanel } from "./components/results-panel"

// Import types and testers
import {
  TestMode,
  TargetInfo,
  EnhancedLayer7Config,
  EnhancedLayer4Config,
  Layer7Stats,
  Layer4Stats,
  HttpResult,
  ConnectionResult,
  Layer7Config as Layer7ConfigType,
  Layer4Config as Layer4ConfigType
} from "@/lib/types"

// Import the testing logic (you'll need to move these from the old files)
import { Layer7Tester } from "@/app/network/layer7"
import { Layer4Tester } from "@/app/network/layer4"

export default function Dashboard() {
  const [testMode, setTestMode] = useState<TestMode>("layer7")
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [defaultTargets, setDefaultTargets] = useState<string[]>([])
  const [isLoadingTargets, setIsLoadingTargets] = useState(true)
  const [targetInfoMap, setTargetInfoMap] = useState<Map<string, TargetInfo>>(new Map())
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0)
  const [customTargetInput, setCustomTargetInput] = useState("")

  // Enhanced Layer 7 Configuration
  const [layer7Config, setLayer7Config] = useState<EnhancedLayer7Config>({
    targets: [],
    customTargets: [],
    useDefaultTargets: true,
    targetRotationEnabled: true,
    maxFailuresPerTarget: 10,
    method: "GET",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    concurrency: 5,
    totalRequests: -1,
    timeout: 1800000,
    followRedirects: true,
    keepAlive: true,
  })

  // Enhanced Layer 4 Configuration
  const [layer4Config, setLayer4Config] = useState<EnhancedLayer4Config>({
    targets: [],
    customTargets: [],
    useDefaultTargets: true,
    targetRotationEnabled: true,
    maxFailuresPerTarget: 10,
    port: 80,
    protocol: "tcp",
    connections: -1,
    duration: 1800,
    timeout: 5000,
  })

  const [layer7Results, setLayer7Results] = useState<HttpResult[]>([])
  const [layer4Results, setLayer4Results] = useState<ConnectionResult[]>([])

  const [layer7Stats, setLayer7Stats] = useState<Layer7Stats>({
    totalRequests: 0,
    completedRequests: 0,
    successfulRequests: 0,
    clientErrors: 0,
    serverErrors: 0,
    networkErrors: 0,
    averageResponseTime: 0,
    minResponseTime: 0,
    maxResponseTime: 0,
    requestsPerSecond: 0,
    totalDataTransferred: 0,
    throughput: 0,
    retries: 0,
  })

  const [layer4Stats, setLayer4Stats] = useState<Layer4Stats>({
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    timeoutConnections: 0,
    duplicateConnections: 0,
    averageResponseTime: 0,
    connectionsPerSecond: 0,
    retries: 0,
  })

  const [progress, setProgress] = useState(0)
  const [userIP, setUserIP] = useState<string>("Loading...")
  const [customRequestCount, setCustomRequestCount] = useState<number>(100)
  const [customConnectionCount, setCustomConnectionCount] = useState<number>(100)

  // Refs for proper cleanup - Fixed typing
  const layer7TesterRef = useRef<Layer7Tester | null>(null)
  const layer4TesterRef = useRef<Layer4Tester | null>(null)
  const startTimeRef = useRef<number>(0)
  const elapsedTimeRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const isStoppingRef = useRef<boolean>(false)

  // Load default targets from GitHub with proper fallback
  useEffect(() => {
    const loadDefaultTargets = async () => {
      setIsLoadingTargets(true)
      try {
        const response = await fetch('https://raw.githubusercontent.com/statehouseke/STOP-IT/main/file.txt')
        if (response.ok) {
          const text = await response.text()
          const targets = text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#') && line.length > 0)
            .slice(0, 100)

          if (targets.length > 0) {
            console.log(`✅ Loaded ${targets.length} targets from GitHub`)
            setDefaultTargets(targets)
            
            // Initialize target info map
            const targetMap = new Map<string, TargetInfo>()
            targets.forEach(target => {
              targetMap.set(target, {
                url: target,
                failureCount: 0,
                lastSuccess: Date.now(),
                isActive: true,
                responseTime: 0
              })
            })
            setTargetInfoMap(targetMap)

            // Set initial targets in configs
            setLayer7Config(prev => ({ ...prev, targets }))
            setLayer4Config(prev => ({ ...prev, targets }))
          } else {
            throw new Error('No valid targets found in the file')
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (error) {
        console.warn('⚠️ Could not load default targets:', error)
        
        // Graceful fallback - disable default targets and encourage custom input
        setDefaultTargets([])
        
        // Initialize empty target map
        setTargetInfoMap(new Map())
        
        // Set configs to use custom targets only
        setLayer7Config(prev => ({ 
          ...prev, 
          targets: [], 
          useDefaultTargets: false, // Automatically switch to custom mode
          customTargets: prev.customTargets.length > 0 ? prev.customTargets : [
            // Provide some example targets to help users get started
            'https://httpbin.org/get',
            'https://jsonplaceholder.typicode.com/posts/1'
          ]
        }))
        setLayer4Config(prev => ({ 
          ...prev, 
          targets: [], 
          useDefaultTargets: false, // Automatically switch to custom mode
          customTargets: prev.customTargets.length > 0 ? prev.customTargets : [
            // Provide some example targets for Layer 4
            'httpbin.org:80',
            'google.com:443'
          ]
        }))

        // Show helpful message in console
        console.info('💡 Tip: Add your own targets in the "Custom Targets" section to get started')
      } finally {
        setIsLoadingTargets(false)
      }
    }

    loadDefaultTargets()
  }, [])

  // Update filtered results - Fixed dependencies
  useEffect(() => {
    // This effect is removed since we're using currentResults directly instead of filteredResults
  }, [])

  // Get user IP
  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => setUserIP(data.ip))
      .catch(() => setUserIP("Unable to fetch"))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (layer7TesterRef.current) {
        layer7TesterRef.current.cleanup()
      }
      if (layer4TesterRef.current) {
        layer4TesterRef.current.cleanup()
      }
      if (elapsedTimeRef.current) {
        clearInterval(elapsedTimeRef.current)
      }
    }
  }, [])

  // Enhanced getCurrentTargets function with better fallback handling
  const getCurrentTargets = useCallback(() => {
    const config = testMode === "layer7" ? layer7Config : layer4Config
    
    if (config.useDefaultTargets && config.targets.length > 0) {
      // Use default targets + custom targets
      return [...config.targets, ...config.customTargets]
    } else if (config.customTargets.length > 0) {
      // Use only custom targets
      return config.customTargets
    } else {
      // No targets available - return empty array
      return []
    }
  }, [testMode, layer7Config, layer4Config])

  const getNextTarget = useCallback(() => {
    const targets = getCurrentTargets()
    if (targets.length === 0) return null

    const config = testMode === "layer7" ? layer7Config : layer4Config
    
    if (!config.targetRotationEnabled) {
      return targets[0]
    }

    const activeTargets = targets.filter(target => {
      const info = targetInfoMap.get(target)
      return !info || info.failureCount < config.maxFailuresPerTarget
    })

    if (activeTargets.length === 0) {
      targets.forEach(target => {
        const info = targetInfoMap.get(target)
        if (info) {
          info.failureCount = 0
          info.isActive = true
        }
      })
      return targets[0]
    }

    const targetIndex = currentTargetIndex % activeTargets.length
    setCurrentTargetIndex(targetIndex + 1)
    return activeTargets[targetIndex]
  }, [getCurrentTargets, testMode, layer7Config, layer4Config, targetInfoMap, currentTargetIndex])

  const updateTargetInfo = useCallback((targetUrl: string, success: boolean, responseTime: number) => {
    setTargetInfoMap(prev => {
      const newMap = new Map(prev)
      const info = newMap.get(targetUrl) || {
        url: targetUrl,
        failureCount: 0,
        lastSuccess: Date.now(),
        isActive: true,
        responseTime: 0
      }

      if (success) {
        info.failureCount = Math.max(0, info.failureCount - 1)
        info.lastSuccess = Date.now()
        info.responseTime = responseTime
      } else {
        info.failureCount += 1
        const config = testMode === "layer7" ? layer7Config : layer4Config
        info.isActive = info.failureCount < config.maxFailuresPerTarget
      }

      newMap.set(targetUrl, info)
      return newMap
    })
  }, [testMode, layer7Config, layer4Config])

  // Enhanced addCustomTarget with validation
  const addCustomTarget = useCallback(() => {
    if (!customTargetInput.trim()) return

    const targets = customTargetInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.length > 0)
      .filter(target => {
        // Basic validation for targets
        if (testMode === "layer7") {
          // For HTTP, accept URLs or domains
          return target.includes('.') || target.startsWith('http')
        } else {
          // For Layer 4, accept domain:port or just domains
          return target.includes('.') && target.length > 3
        }
      })

    if (targets.length === 0) {
      alert('Please enter valid targets. For HTTP: use URLs like "https://example.com". For Network: use "domain.com:port" format.')
      return
    }

    if (testMode === "layer7") {
      setLayer7Config(prev => ({
        ...prev,
        customTargets: [...new Set([...prev.customTargets, ...targets])]
      }))
    } else {
      setLayer4Config(prev => ({
        ...prev,
        customTargets: [...new Set([...prev.customTargets, ...targets])]
      }))
    }

    setCustomTargetInput("")
    
    // If this is the first time adding targets and default targets failed, 
    // show helpful message
    if (defaultTargets.length === 0) {
      console.info('✅ Custom targets added successfully!')
    }
  }, [customTargetInput, testMode, defaultTargets.length])

  const removeCustomTarget = useCallback((target: string) => {
    if (testMode === "layer7") {
      setLayer7Config(prev => ({
        ...prev,
        customTargets: prev.customTargets.filter(t => t !== target)
      }))
    } else {
      setLayer4Config(prev => ({
        ...prev,
        customTargets: prev.customTargets.filter(t => t !== target)
      }))
    }
  }, [testMode])

  const handleSearch = useCallback((query: string) => {
    // Search functionality can be implemented in the ResultsPanel component directly
    // since we're passing currentResults to it
    console.log('Search query:', query)
  }, [])

  const startTest = async () => {
    const targets = getCurrentTargets()
    if (targets.length === 0) {
      alert('Please add at least one target before starting the test.')
      return
    }

    setIsRunning(true)
    setIsPaused(false)
    setProgress(0)
    setElapsedTime(0)
    isStoppingRef.current = false
    startTimeRef.current = Date.now()

    // Start elapsed time tracking
    elapsedTimeRef.current = setInterval(() => {
      if (isStoppingRef.current) return
      
      const elapsed = Date.now() - startTimeRef.current
      setElapsedTime(elapsed)

      // Calculate progress based on timeout/duration
      const maxTime = testMode === "layer7" ? layer7Config.timeout : layer4Config.duration * 1000
      const progressPercent = Math.min((elapsed / maxTime) * 100, 100)
      setProgress(progressPercent)

      // Auto-complete when time limit reached
      if (progressPercent >= 100) {
        completeTest()
      }
    }, 100)

    if (testMode === "layer7") {
      // Clear previous results
      setLayer7Results([])

      // Initialize Layer 7 tester
      layer7TesterRef.current = new Layer7Tester(
        (result: HttpResult) => {
          if (isStoppingRef.current) return
          setLayer7Results((prev) => [...prev, result])
          updateTargetInfo(result.url, result.success, result.responseTime)
        },
        (stats: Layer7Stats) => {
          if (isStoppingRef.current) return
          setLayer7Stats(stats)
          if (layer7Config.totalRequests > 0 && stats.completedRequests >= layer7Config.totalRequests) {
            setTimeout(() => completeTest(), 100)
          }
        },
        (progress: number) => {
          if (isStoppingRef.current) return
          if (layer7Config.totalRequests > 0) {
            setProgress(Math.min(progress, 100))
          }
        },
        () => {
          if (!isStoppingRef.current) {
            completeTest()
          }
        }
      )

      try {
        const currentTarget = getNextTarget()
        if (!currentTarget) {
          throw new Error('No valid targets available')
        }

        const testConfig: Layer7ConfigType = {
          ...layer7Config,
          url: currentTarget,
          totalRequests: layer7Config.totalRequests === -1 ? 999999 : layer7Config.totalRequests
        }

        await layer7TesterRef.current.startTest(testConfig)
      } catch (error) {
        console.error("Layer 7 test failed:", error)
        completeTest()
      }
    } else {
      // Clear previous results
      setLayer4Results([])

      // Initialize Layer 4 tester
      layer4TesterRef.current = new Layer4Tester(
        (result: ConnectionResult) => {
          if (isStoppingRef.current) return
          setLayer4Results((prev) => [...prev, result])
          updateTargetInfo(`${result.target}:${result.port}`, result.status === "connected", result.responseTime)
        },
        (stats: Layer4Stats) => {
          if (isStoppingRef.current) return
          setLayer4Stats(stats)
          if (layer4Config.connections > 0 && stats.totalConnections >= layer4Config.connections) {
            setTimeout(() => completeTest(), 100)
          }
        },
        (progress: number) => {
          if (isStoppingRef.current) return
          if (layer4Config.connections > 0) {
            setProgress(Math.min(progress, 100))
          }
        },
        () => {
          if (!isStoppingRef.current) {
            completeTest()
          }
        }
      )

      try {
        const currentTarget = getNextTarget()
        if (!currentTarget) {
          throw new Error('No valid targets available')
        }

        // Extract host and port from target
        let host = currentTarget
        let port = layer4Config.port

        try {
          const url = new URL(currentTarget.startsWith('http') ? currentTarget : `http://${currentTarget}`)
          host = url.hostname
          port = url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80)
        } catch {
          const parts = currentTarget.split(':')
          if (parts.length === 2) {
            host = parts[0]
            port = parseInt(parts[1]) || port
          }
        }

        const testConfig: Layer4ConfigType = {
          ...layer4Config,
          target: host,
          port,
          connections: layer4Config.connections === -1 ? 999999 : layer4Config.connections
        }

        await layer4TesterRef.current.startTest(testConfig)
      } catch (error) {
        console.error("Layer 4 test failed:", error)
        completeTest()
      }
    }
  }

  const completeTest = () => {
    isStoppingRef.current = true
    setIsRunning(false)
    setIsPaused(false)
    setProgress(100)

    // Cleanup testers
    if (layer7TesterRef.current) {
      layer7TesterRef.current.stopTest()
      layer7TesterRef.current = null
    }
    if (layer4TesterRef.current) {
      layer4TesterRef.current.stopTest()
      layer4TesterRef.current = null
    }

    // Clear timer
    if (elapsedTimeRef.current) {
      clearInterval(elapsedTimeRef.current)
      elapsedTimeRef.current = undefined
    }
  }

  const pauseTest = () => {
    setIsPaused(true)
    if (layer7TesterRef.current) {
      layer7TesterRef.current.pauseTest()
    }
    if (layer4TesterRef.current) {
      layer4TesterRef.current.pauseTest()
    }
    if (elapsedTimeRef.current) {
      clearInterval(elapsedTimeRef.current)
    }
  }

  const resumeTest = async () => {
    setIsPaused(false)
    startTimeRef.current = Date.now() - elapsedTime

    elapsedTimeRef.current = setInterval(() => {
      if (isStoppingRef.current) return
      const elapsed = Date.now() - startTimeRef.current
      setElapsedTime(elapsed)
    }, 100)

    if (layer7TesterRef.current) {
      const currentTarget = getNextTarget()
      if (currentTarget) {
        const testConfig: Layer7ConfigType = {
          ...layer7Config,
          url: currentTarget,
          totalRequests: layer7Config.totalRequests === -1 ? 999999 : layer7Config.totalRequests
        }
        layer7TesterRef.current.resumeTest(testConfig)
      }
    }
    if (layer4TesterRef.current) {
      const currentTarget = getNextTarget()
      if (currentTarget) {
        let host = currentTarget
        let port = layer4Config.port

        try {
          const url = new URL(currentTarget.startsWith('http') ? currentTarget : `http://${currentTarget}`)
          host = url.hostname
          port = url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80)
        } catch {
          const parts = currentTarget.split(':')
          if (parts.length === 2) {
            host = parts[0]
            port = parseInt(parts[1]) || port
          }
        }

        const testConfig: Layer4ConfigType = {
          ...layer4Config,
          target: host,
          port,
          connections: layer4Config.connections === -1 ? 999999 : layer4Config.connections
        }
        layer4TesterRef.current.resumeTest(testConfig)
      }
    }
  }

  const stopTest = () => {
    completeTest()
  }

  const clearResults = () => {
    setLayer7Results([])
    setLayer4Results([])
    setLayer7Stats({
      totalRequests: 0,
      completedRequests: 0,
      successfulRequests: 0,
      clientErrors: 0,
      serverErrors: 0,
      networkErrors: 0,
      averageResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      totalDataTransferred: 0,
      throughput: 0,
      retries: 0,
    })
    setLayer4Stats({
      totalConnections: 0,
      successfulConnections: 0,
      failedConnections: 0,
      timeoutConnections: 0,
      duplicateConnections: 0,
      averageResponseTime: 0,
      connectionsPerSecond: 0,
      retries: 0,
    })
    setProgress(0)
    setElapsedTime(0)
    
    // Reset target info
    setTargetInfoMap(prev => {
      const newMap = new Map(prev)
      newMap.forEach((info) => {
        info.failureCount = 0
        info.isActive = true
        info.lastSuccess = Date.now()
        info.responseTime = 0
      })
      return newMap
    })
  }

  const exportResults = () => {
    const data = {
      testMode,
      layer7Config,
      layer4Config,
      layer7Stats,
      layer4Stats,
      layer7Results,
      layer4Results,
      targetInfoMap: Object.fromEntries(targetInfoMap),
      timestamp: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ngulusumu-canon-${testMode}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  // Get current results based on test mode
  const currentResults = testMode === "layer7" ? layer7Results : layer4Results

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-red-50 dark:from-gray-900 dark:via-green-900/20 dark:to-red-900/20 transition-colors duration-500">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-red-400/20 to-green-500/20 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-black/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-red-400/10 to-green-400/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header - Enhanced Mobile Design */}
        <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-all duration-200 hover:scale-105">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-600 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-readable-dark">Ngulusumu Canon</h1>
                <p className="text-sm text-readable-light">Security Dashboard</p>
              </div>
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/">
                <ResponsiveButton variant="secondary" size="sm" className="h-10 sm:h-11 shadow-md hover:shadow-lg transition-all duration-200">
                  <Home className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline ml-2">Home</span>
                </ResponsiveButton>
              </Link>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex-1 sm:flex-initial min-w-0">
              <SystemMonitor />
            </div>
            <GlassCard className="p-3 flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-2 text-readable-muted">
                <Globe className="h-4 w-4 flex-shrink-0 text-blue-500" />
                <span className="text-sm font-medium truncate">{userIP}</span>
              </div>
            </GlassCard>
            <GlassCard className="p-3 flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-2 text-readable-muted">
                <Clock className="h-4 w-4 flex-shrink-0 text-green-500" />
                <span className="text-sm font-medium">{formatTime(elapsedTime)}</span>
              </div>
            </GlassCard>
            <NostrStatus />
            <ThemeToggle />
          </div>
        </header>

        {/* Welcome Section - Enhanced Design */}
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-3 px-4 sm:px-6 py-3 rounded-full bg-gradient-to-r from-red-500/10 to-green-500/10 border border-red-500/20 dark:border-green-500/20 shadow-lg backdrop-blur-sm">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-green-400" />
            <span className="text-sm sm:text-base font-medium text-readable-dark">Security Operations Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold">
            <span className="bg-gradient-to-r from-red-600 via-black to-green-600 dark:from-red-400 dark:via-white dark:to-green-400 bg-clip-text text-transparent">
              Ngulusumu Canon
            </span>
            <span className="text-readable-dark block sm:inline sm:ml-2"> Dashboard</span>
          </h1>
          <p className="text-base sm:text-lg text-readable-muted max-w-3xl mx-auto px-4 leading-relaxed">
            Advanced cybersecurity testing platform with real-time analytics and comprehensive monitoring capabilities
          </p>
        </div>

        {/* Test Mode Selector - Enhanced Design */}
        <div className="flex justify-center">
          <GlassCard className="p-2 shadow-xl">
            <div className="flex rounded-xl overflow-hidden bg-white/30 dark:bg-black/30">
              <button
                onClick={() => setTestMode("layer7")}
                disabled={isRunning}
                className={`flex items-center gap-3 px-6 py-4 transition-all duration-300 ${
                  testMode === "layer7"
                    ? "bg-gradient-to-r from-green-500/30 to-green-600/30 text-green-700 dark:text-green-300 shadow-lg transform scale-105"
                    : "text-readable-muted hover:text-readable-dark hover:bg-white/50 dark:hover:bg-black/20"
                } disabled:opacity-50 disabled:cursor-not-allowed rounded-lg`}
              >
                <Globe className="h-5 w-5" />
                <div className="text-left">
                  <div className="text-sm font-bold">HTTP/HTTPS</div>
                  <div className="text-xs opacity-75">Layer 7 Testing</div>
                </div>
              </button>
              <button
                onClick={() => setTestMode("layer4")}
                disabled={isRunning}
                className={`flex items-center gap-3 px-6 py-4 transition-all duration-300 ${
                  testMode === "layer4"
                    ? "bg-gradient-to-r from-blue-500/30 to-blue-600/30 text-blue-700 dark:text-blue-300 shadow-lg transform scale-105"
                    : "text-readable-muted hover:text-readable-dark hover:bg-white/50 dark:hover:bg-black/20"
                } disabled:opacity-50 disabled:cursor-not-allowed rounded-lg`}
              >
                <Wifi className="h-5 w-5" />
                <div className="text-left">
                  <div className="text-sm font-bold">TCP/UDP</div>
                  <div className="text-xs opacity-75">Layer 4 Testing</div>
                </div>
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Speed Gauges - Enhanced Responsive Design */}
        <GlassCard className="p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-green-500/20 shadow-lg">
              <Activity className="h-6 w-6 text-red-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-readable-dark">
              Real-Time Performance Metrics
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {testMode === "layer7" ? (
              <>
                <SpeedGauge
                  value={layer7Stats.requestsPerSecond}
                  maxValue={100}
                  label="Requests/sec"
                  unit="req/s"
                  color="#dc2626"
                />
                <SpeedGauge
                  value={
                    layer7Stats.totalRequests > 0
                      ? (layer7Stats.successfulRequests / layer7Stats.totalRequests) * 100
                      : 0
                  }
                  maxValue={100}
                  label="Success Rate"
                  unit="%"
                  color="#16a34a"
                />
                <SpeedGauge
                  value={layer7Stats.averageResponseTime}
                  maxValue={5000}
                  label="Avg Response"
                  unit="ms"
                  color="#000000"
                />
                <SpeedGauge
                  value={layer7Stats.totalRequests}
                  maxValue={1000}
                  label="Total Requests"
                  unit="reqs"
                  color="#dc2626"
                />
              </>
            ) : (
              <>
                <SpeedGauge
                  value={layer4Stats.connectionsPerSecond}
                  maxValue={50}
                  label="Connections/sec"
                  unit="conn/s"
                  color="#dc2626"
                />
                <SpeedGauge
                  value={
                    layer4Stats.totalConnections > 0
                      ? (layer4Stats.successfulConnections / layer4Stats.totalConnections) * 100
                      : 0
                  }
                  maxValue={100}
                  label="Success Rate"
                  unit="%"
                  color="#16a34a"
                />
                <SpeedGauge
                  value={layer4Stats.averageResponseTime}
                  maxValue={3000}
                  label="Avg Response"
                  unit="ms"
                  color="#000000"
                />
                <SpeedGauge
                  value={layer4Stats.totalConnections}
                  maxValue={100}
                  label="Total Connections"
                  unit="conns"
                  color="#dc2626"
                />
              </>
            )}
          </div>
        </GlassCard>

        {/* Stats Cards - Enhanced Mobile Design */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {testMode === "layer7" ? (
            <>
              <GlassCard className="p-4 sm:p-6 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 shadow-md">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-readable-dark truncate">{layer7Stats.successfulRequests}</div>
                    <div className="text-sm text-readable-light">Successful</div>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4 sm:p-6 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 shadow-md">
                    <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-readable-dark truncate">
                      {layer7Stats.clientErrors + layer7Stats.serverErrors + layer7Stats.networkErrors}
                    </div>
                    <div className="text-sm text-readable-light">Failed</div>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4 sm:p-6 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-black/20 to-gray-600/20 shadow-md">
                    <Cpu className="h-5 w-5 sm:h-6 sm:w-6 text-gray-800 dark:text-gray-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-readable-dark truncate">
                      {formatTime(layer7Stats.minResponseTime || 0)}
                    </div>
                    <div className="text-sm text-readable-light">Min Response</div>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4 sm:p-6 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 shadow-md">
                    <Network className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-readable-dark truncate">
                      {formatBytes(layer7Stats.totalDataTransferred)}
                    </div>
                    <div className="text-sm text-readable-light">Data Transfer</div>
                  </div>
                </div>
              </GlassCard>
            </>
          ) : (
            <>
              <GlassCard className="p-4 sm:p-6 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 shadow-md">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-readable-dark truncate">{layer4Stats.successfulConnections}</div>
                    <div className="text-sm text-readable-light">Connected</div>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4 sm:p-6 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 shadow-md">
                    <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-readable-dark truncate">{layer4Stats.failedConnections}</div>
                    <div className="text-sm text-readable-light">Failed</div>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4 sm:p-6 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 shadow-md">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-readable-dark truncate">{layer4Stats.timeoutConnections}</div>
                    <div className="text-sm text-readable-light">Timeouts</div>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4 sm:p-6 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 shadow-md">
                    <Wifi className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-readable-dark truncate">
                      {formatTime(layer4Stats.averageResponseTime || 0)}
                    </div>
                    <div className="text-sm text-readable-light">Avg Response</div>
                  </div>
                </div>
              </GlassCard>
            </>
          )}
        </div>

        {/* Progress Bar - Enhanced Mobile Design */}
        {isRunning && (
          <GlassCard className="p-4 sm:p-6 shadow-xl">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-lg sm:text-xl font-bold text-readable-dark">Operation Progress</span>
                <span className="text-base sm:text-lg font-bold text-readable-muted">{progress.toFixed(1)}%</span>
              </div>
              <div className="relative">
                <Progress value={progress} className="h-3 sm:h-4" />
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-green-500/20 rounded-full blur-sm" />
              </div>
              <div className="flex items-center justify-center gap-3 text-sm sm:text-base text-readable-muted">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg" />
                <span className="font-medium">Active since {formatTime(elapsedTime)}</span>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Main Content - Enhanced Responsive Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Configuration Panel - Enhanced Design */}
          <GlassCard className="p-6 sm:p-8 xl:col-span-1 order-2 xl:order-1 shadow-xl">
            <div className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-green-500/20 shadow-lg">
                  <Settings className="h-6 w-6 text-red-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-readable-dark">
                    {testMode === "layer7" ? "HTTP Security" : "Network"} Configuration
                  </h3>
                  <p className="text-sm text-readable-muted">Configure your security testing parameters</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Target Management Section */}
                <TargetManagement
                  testMode={testMode}
                  layer7Config={layer7Config}
                  layer4Config={layer4Config}
                  setLayer7Config={setLayer7Config}
                  setLayer4Config={setLayer4Config}
                  defaultTargets={defaultTargets}
                  isLoadingTargets={isLoadingTargets}
                  targetInfoMap={targetInfoMap}
                  customTargetInput={customTargetInput}
                  setCustomTargetInput={setCustomTargetInput}
                  isRunning={isRunning}
                  getCurrentTargets={getCurrentTargets}
                  addCustomTarget={addCustomTarget}
                  removeCustomTarget={removeCustomTarget}
                />

                {/* Protocol-Specific Configuration */}
                {testMode === "layer7" ? (
                  <Layer7Config
                    config={layer7Config}
                    setConfig={setLayer7Config}
                    customRequestCount={customRequestCount}
                    setCustomRequestCount={setCustomRequestCount}
                    isRunning={isRunning}
                  />
                ) : (
                  <Layer4Config
                    config={layer4Config}
                    setConfig={setLayer4Config}
                    customConnectionCount={customConnectionCount}
                    setCustomConnectionCount={setCustomConnectionCount}
                    isRunning={isRunning}
                  />
                )}

                {/* Control Buttons - Enhanced Mobile Design */}
                <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  {/* Primary Action Button */}
                  <div className="w-full">
                    {!isRunning ? (
                      <ResponsiveButton
                        onClick={startTest}
                        variant="primary"
                        className="w-full h-14 sm:h-16 text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 text-white shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 transform hover:scale-105"
                        disabled={getCurrentTargets().length === 0}
                      >
                        <Play className="h-5 w-5 sm:h-6 sm:w-6 mr-3" />
                        Launch {testMode === "layer7" ? "HTTP" : "Network"} Operation
                      </ResponsiveButton>
                    ) : isPaused ? (
                      <ResponsiveButton
                        onClick={resumeTest}
                        variant="success"
                        className="w-full h-14 sm:h-16 text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-green-600 via-green-700 to-green-800 hover:from-green-700 hover:via-green-800 hover:to-green-900 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                      >
                        <Play className="h-5 w-5 sm:h-6 sm:w-6 mr-3" />
                        Resume Operation
                      </ResponsiveButton>
                    ) : (
                      <ResponsiveButton
                        onClick={pauseTest}
                        variant="secondary"
                        className="w-full h-14 sm:h-16 text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 hover:from-yellow-600 hover:via-yellow-700 hover:to-yellow-800 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                      >
                        <Pause className="h-5 w-5 sm:h-6 sm:w-6 mr-3" />
                        Pause Operation
                      </ResponsiveButton>
                    )}
                  </div>

                  {/* Secondary Actions - Enhanced Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <ResponsiveButton
                      onClick={stopTest}
                      variant="danger"
                      disabled={!isRunning}
                      className="h-12 sm:h-14 text-sm sm:text-base font-bold bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 disabled:from-gray-400 disabled:to-gray-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <Square className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Stop
                    </ResponsiveButton>

                    <ResponsiveButton
                      onClick={clearResults}
                      variant="secondary"
                      disabled={isRunning}
                      className="h-12 sm:h-14 text-sm sm:text-base font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Clear
                    </ResponsiveButton>

                    <ResponsiveButton
                      onClick={exportResults}
                      variant="primary"
                      disabled={currentResults.length === 0}
                      className="h-12 sm:h-14 text-sm sm:text-base font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-purple-400 disabled:to-purple-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Export
                    </ResponsiveButton>
                  </div>

                  {/* Status Indicators - Enhanced Design */}
                  {isRunning && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-500/15 to-green-600/15 border border-green-500/30 shadow-lg backdrop-blur-sm">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg" />
                        <span className="text-sm sm:text-base font-bold text-green-700 dark:text-green-300">
                          Operation Active - {formatTime(elapsedTime)} elapsed
                        </span>
                      </div>
                      
                      {/* Current Target Display */}
                      <div className="p-4 rounded-xl bg-white/50 dark:bg-black/30 text-center shadow-md border border-white/20 dark:border-black/20">
                        <div className="text-sm text-readable-muted mb-2 font-medium">Current Target</div>
                        <div className="font-mono text-sm sm:text-base text-readable-dark truncate font-bold">
                          {getCurrentTargets()[currentTargetIndex % getCurrentTargets().length] || "No targets"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warning for no targets */}
                  {getCurrentTargets().length === 0 && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-red-500/15 to-red-600/15 border border-red-500/30 shadow-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <span className="text-sm sm:text-base font-medium text-red-700 dark:text-red-300">
                        No targets configured. Add targets to start operation.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Results Panel - Enhanced Design */}
          <div className="xl:col-span-2 space-y-6 order-1 xl:order-2">
            <ResultsPanel
              testMode={testMode}
              isRunning={isRunning}
              currentResults={currentResults}
              layer7Stats={layer7Stats}
              layer4Stats={layer4Stats}
              targetInfoMap={targetInfoMap}
              getCurrentTargets={getCurrentTargets}
              formatTime={formatTime}
              formatBytes={formatBytes}
              handleSearch={handleSearch}
              setTargetInfoMap={setTargetInfoMap}
            />
          </div>
        </div>

        {/* Footer - Enhanced Design */}
        <footer className="text-center text-sm sm:text-base text-readable-light pt-8 sm:pt-12 border-t border-gray-200 dark:border-gray-800">
          <div className="space-y-2">
            <p className="font-medium">
              Professional cybersecurity dashboard with real-time analytics.
            </p>
            <p className="text-xs sm:text-sm">
              <span className="font-semibold text-readable-dark">Use responsibly and monitor efficiently.</span>
              <span className="block sm:inline sm:ml-2">Built with security and performance in mind.</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}