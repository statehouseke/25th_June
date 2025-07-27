// Optimized Layer 4 Network Tester for Browser Performance
"use client"

export interface Layer4Config {
  target: string
  port: number
  protocol: "tcp" | "udp"
  connections: number
  duration: number
  timeout: number
  maxRetries?: number
  backoffStrategy?: 'linear' | 'exponential'
  uniqueTargets?: boolean
}

export interface ConnectionResult {
  id: string
  timestamp: number
  target: string
  port: number
  protocol: string
  status: "failed" | "timeout" | "duplicate"
  responseTime: number
  error?: string
  retryAttempt?: number
}

export interface Layer4Stats {
  totalConnections: number
  successfulConnections: number
  failedConnections: number
  timeoutConnections: number
  duplicateConnections: number
  averageResponseTime: number
  connectionsPerSecond: number
  retries: number
}

// Define proper error types
interface ConnectionError extends Error {
  code?: string
  name: string
}

export class Layer4Tester {
  private activeConnections = new Set<AbortController>()
  private isRunning = false
  private isPaused = false
  private startTime = 0
  private results: ConnectionResult[] = []
  private connectionQueue: number[] = []
  private processedTargets = new Set<string>()
  private retriedConnections = 0

  constructor(
    private onResult: (result: ConnectionResult) => void,
    private onStats: (stats: Layer4Stats) => void,
    private onProgress: (progress: number) => void,
    private onComplete?: () => void
  ) {}

  // Calculate backoff delay for retries
  private calculateBackoffDelay(attempt: number, strategy: 'linear' | 'exponential' = 'exponential'): number {
    if (strategy === 'linear') {
      return attempt * 500 // 500ms increments
    }
    // Exponential backoff with jitter
    return Math.min(
      30000, // Max delay of 30 seconds
      Math.pow(2, attempt) * 1000 + Math.random() * 1000
    )
  }

  // Generate unique target identifier
  private generateTargetKey(config: Layer4Config): string {
    return `${config.protocol}://${config.target}:${config.port}`
  }

  async testConnection(
    config: Layer4Config, 
    connectionId: string, 
    retryAttempt = 0
  ): Promise<ConnectionResult> {
    const startTime = performance.now()
    const controller = new AbortController()
    this.activeConnections.add(controller)

    // Check for duplicate if uniqueTargets is enabled
    const targetKey = this.generateTargetKey(config)
    if (config.uniqueTargets && this.processedTargets.has(targetKey)) {
      return {
        id: connectionId,
        timestamp: Date.now(),
        target: config.target,
        port: config.port,
        protocol: config.protocol,
        status: "duplicate",
        responseTime: 0,
        error: 'Duplicate target'
      }
    }

    try {
      // Simulate connection test with fetch
      const testUrl = this.buildTestUrl(config)
      
      const timeoutPromise = new Promise<Response>((_, reject) => 
        setTimeout(() => {
          controller.abort('Connection timeout')
          reject(new Error('Connection timeout'))
        }, config.timeout)
      )

      const fetchPromise = fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors',
        cache: 'no-cache',
        keepalive: true
      })

      // Wait for either fetch or timeout
      await Promise.race([fetchPromise, timeoutPromise])

      const endTime = performance.now()
      const responseTime = endTime - startTime

      // Mark target as processed if unique targets are required
      if (config.uniqueTargets) {
        this.processedTargets.add(targetKey)
      }

      return {
        id: connectionId,
        timestamp: Date.now(),
        target: config.target,
        port: config.port,
        protocol: config.protocol,
        status: "failed", // Since we can't actually verify successful connections in browser
        responseTime,
        retryAttempt: retryAttempt > 0 ? retryAttempt : undefined,
        error: 'Browser connection simulation'
      }
    } catch (error: unknown) {
      const endTime = performance.now()
      const responseTime = endTime - startTime

      const connectionError = error as ConnectionError

      // Retry mechanism
      const isRetryable = 
        (config.maxRetries ?? 0) > retryAttempt && 
        (connectionError.name === 'AbortError' || connectionError.code === 'ECONNABORTED')

      if (isRetryable) {
        const delay = this.calculateBackoffDelay(retryAttempt, config.backoffStrategy)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        this.retriedConnections++
        
        return this.testConnection(
          config, 
          connectionId, 
          retryAttempt + 1
        )
      }

      let status: "failed" | "timeout" = "failed"
      if (connectionError.name === 'AbortError') {
        status = "timeout"
      }

      return {
        id: connectionId,
        timestamp: Date.now(),
        target: config.target,
        port: config.port,
        protocol: config.protocol,
        status,
        responseTime,
        error: connectionError.message || 'Connection failed',
        retryAttempt: retryAttempt > 0 ? retryAttempt : undefined
      }
    } finally {
      this.activeConnections.delete(controller)
    }
  }

  private buildTestUrl(config: Layer4Config): string {
    // Build appropriate test URL based on protocol and port
    const protocol = config.port === 443 || config.port === 8443 ? 'https' : 'http'
    
    // Handle common ports
    if ((protocol === 'http' && config.port === 80) || 
        (protocol === 'https' && config.port === 443)) {
      return `${protocol}://${config.target}`
    }
    
    return `${protocol}://${config.target}:${config.port}`
  }

  async startTest(config: Layer4Config): Promise<void> {
    // Reset and initialize test
    this.isRunning = true
    this.isPaused = false
    this.startTime = Date.now()
    this.results = []
    this.processedTargets.clear()
    this.retriedConnections = 0

    // Normalize configuration
    const normalizedConfig: Layer4Config = {
      ...config,
      connections: Math.min(config.connections, navigator.hardwareConcurrency || 5),
      timeout: Math.max(1000, config.timeout || 5000),
      maxRetries: config.maxRetries ?? 2,
      backoffStrategy: config.backoffStrategy ?? 'exponential',
      uniqueTargets: config.uniqueTargets ?? true
    }

    // Prepare connection queue
    this.connectionQueue = Array.from({ length: normalizedConfig.connections }, (_, i) => i)

    const maxConcurrent = Math.min(5, normalizedConfig.connections)
    let activeConnections = 0

    const processConnection = async (): Promise<void> => {
      if (this.connectionQueue.length === 0 || !this.isRunning || this.isPaused) return

      activeConnections++
      const connectionIndex = this.connectionQueue.shift()!
      const connectionId = `l4-${Date.now()}-${connectionIndex}-${Math.random().toString(36).substr(2, 9)}`

      try {
        const result = await this.testConnection(normalizedConfig, connectionId)
        this.results.push(result)
        this.onResult(result)
        this.updateStats()

        // Calculate progress
        const progress = ((normalizedConfig.connections - this.connectionQueue.length) / normalizedConfig.connections) * 100
        this.onProgress(progress)

      } catch (error) {
        console.error('Layer 4 connection test error:', error)
      } finally {
        activeConnections--
        
        // Process next connection if available
        if (this.connectionQueue.length > 0 && 
            activeConnections < maxConcurrent && 
            this.isRunning && 
            !this.isPaused) {
          setTimeout(processConnection, 100) // Prevent browser overwhelm
        }

        // Check if test is complete
        if (this.connectionQueue.length === 0) {
          this.stopTest()
          this.onComplete?.()
        }
      }
    }

    // Start initial connections with staggered timing
    for (let i = 0; i < maxConcurrent && i < normalizedConfig.connections; i++) {
      setTimeout(processConnection, i * 50)
    }

    // Auto-stop after duration
    setTimeout(() => {
      this.stopTest()
    }, normalizedConfig.duration * 1000)
  }

  pauseTest(): void {
    this.isPaused = true
    
    // Graceful request cancellation
    this.activeConnections.forEach(controller => {
      try {
        controller.abort('Test paused')
      } catch (error) {
        console.warn('Error aborting connection:', error)
      }
    })
    this.activeConnections.clear()
  }

  resumeTest(config: Layer4Config): void {
    if (this.connectionQueue.length > 0) {
      this.isPaused = false
      this.startTest(config)
    }
  }

  private updateStats(): void {
    const successful = this.results.filter(r => r.status === "failed" && !r.error?.includes('timeout'))
    const failed = this.results.filter(r => r.status === "failed" && r.error?.includes('failed'))
    const timeouts = this.results.filter(r => r.status === "timeout")
    const duplicates = this.results.filter(r => r.status === "duplicate")
    const responseTimes = this.results.map(r => r.responseTime)
    const elapsedTime = Date.now() - this.startTime

    const stats: Layer4Stats = {
      totalConnections: this.results.length,
      successfulConnections: successful.length,
      failedConnections: failed.length,
      timeoutConnections: timeouts.length,
      duplicateConnections: duplicates.length,
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0,
      connectionsPerSecond: elapsedTime > 0 ? this.results.length / (elapsedTime / 1000) : 0,
      retries: this.retriedConnections
    }

    this.onStats(stats)
  }

  stopTest(): void {
    this.isRunning = false
    this.isPaused = false
    
    // Abort all active connections
    this.activeConnections.forEach(controller => {
      try {
        controller.abort()
      } catch (error) {
        console.warn('Error aborting connection:', error)
      }
    })
    this.activeConnections.clear()

    // Final stats update
    if (this.results.length > 0) {
      this.updateStats()
    }

    // Optional: Log performance insights
    this.logPerformanceInsights()
  }

  // Performance insights logging
  private logPerformanceInsights(): void {
    const stats = this.getStats()
    if (stats) {
      console.group('Layer 4 Test Performance Insights')
      console.log('Total Connections:', stats.totalConnections)
      console.log('Successful Connections:', stats.successfulConnections)
      console.log('Failed Connections:', stats.failedConnections)
      console.log('Timeout Connections:', stats.timeoutConnections)
      console.log('Duplicate Connections:', stats.duplicateConnections)
      console.log('Average Response Time:', stats.averageResponseTime.toFixed(2) + 'ms')
      console.log('Connections per Second:', stats.connectionsPerSecond.toFixed(2))
      console.log('Retries:', stats.retries)
      console.groupEnd()
    }
  }

  getResults(): ConnectionResult[] {
    return [...this.results]
  }

  getStats(): Layer4Stats | null {
    if (this.results.length === 0) return null
    
    const successful = this.results.filter(r => r.status === "failed" && !r.error?.includes('timeout'))
    const failed = this.results.filter(r => r.status === "failed" && r.error?.includes('failed'))
    const timeouts = this.results.filter(r => r.status === "timeout")
    const duplicates = this.results.filter(r => r.status === "duplicate")
    const responseTimes = this.results.map(r => r.responseTime)
    const elapsedTime = Date.now() - this.startTime

    return {
      totalConnections: this.results.length,
      successfulConnections: successful.length,
      failedConnections: failed.length,
      timeoutConnections: timeouts.length,
      duplicateConnections: duplicates.length,
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0,
      connectionsPerSecond: elapsedTime > 0 ? this.results.length / (elapsedTime / 1000) : 0,
      retries: this.retriedConnections
    }
  }

  cleanup(): void {
    this.stopTest()
    this.results = []
    this.connectionQueue = []
    this.processedTargets.clear()
    this.retriedConnections = 0
    
    // Aggressive memory cleanup
    if (window.gc) {
      try {
        window.gc()
      } catch {
        console.warn('Manual garbage collection not available')
      }
    }

    // Nullify references to help with memory management
    this.onResult = () => {}
    this.onStats = () => {}
    this.onProgress = () => {}
    this.onComplete = undefined
  }
}