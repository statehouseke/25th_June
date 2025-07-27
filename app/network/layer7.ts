// Optimized Layer 7 Network Tester for Browser Performance
"use client"

export interface Layer7Config {
  url: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"
  headers: Record<string, string>
  body: string
  concurrency: number
  totalRequests: number
  timeout: number
  followRedirects: boolean
  keepAlive: boolean
  retryCount?: number
  backoffStrategy?: 'linear' | 'exponential'
}

export interface HttpResult {
  id: string
  timestamp: number
  method: string
  url: string
  status: number
  statusText: string
  responseTime: number
  responseSize: number
  success: boolean
  error?: string
  headers?: Record<string, string>
  retryAttempt?: number
}

export interface Layer7Stats {
  totalRequests: number
  completedRequests: number
  successfulRequests: number
  clientErrors: number
  serverErrors: number
  networkErrors: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  requestsPerSecond: number
  totalDataTransferred: number
  throughput: number
  retries: number
}

// Define proper error types for better type safety
interface HttpError extends Error {
  code?: string
  name: string
  status?: number
}

export class Layer7Tester {
  private activeRequests = new Set<AbortController>()
  private isRunning = false
  private isPaused = false
  private startTime = 0
  private results: HttpResult[] = []
  private requestQueue: number[] = []
  private completedCount = 0
  private retriedRequests = 0
  private requestTimeouts: Map<string, NodeJS.Timeout> = new Map()

  constructor(
    private onResult: (result: HttpResult) => void,
    private onStats: (stats: Layer7Stats) => void,
    private onProgress: (progress: number) => void,
    private onComplete?: () => void
  ) {}

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

  async makeHttpRequest(config: Layer7Config, requestId: string, requestIndex: number, retryAttempt = 0): Promise<HttpResult> {
    const controller = new AbortController()
    this.activeRequests.add(controller)
    
    const startTime = performance.now()
    
    try {
      const requestOptions: RequestInit = {
        method: config.method,
        headers: {
          ...config.headers,
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': config.keepAlive ? 'keep-alive' : 'close',
        },
        signal: controller.signal,
        redirect: config.followRedirects ? 'follow' : 'manual',
        cache: 'no-cache',
        mode: 'cors',
      }

      // Add body for non-GET/HEAD requests
      if (config.method !== "GET" && config.method !== "HEAD" && config.body) {
        requestOptions.body = config.body
      }

      // Set up timeout with more precise handling
      const timeoutPromise = new Promise<Response>((_, reject) => {
        const timeoutId = setTimeout(() => {
          controller.abort('Request timed out')
          reject(new Error('Request timed out'))
        }, config.timeout)
        
        this.requestTimeouts.set(requestId, timeoutId)
      })

      // Race between fetch and timeout
      const responsePromise = fetch(config.url, requestOptions)
      const response = await Promise.race([responsePromise, timeoutPromise])
      
      const endTime = performance.now()
      const responseTime = endTime - startTime

      // Clear timeout
      const existingTimeout = this.requestTimeouts.get(requestId)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
        this.requestTimeouts.delete(requestId)
      }
      
      // Get response data for size calculation
      const responseText = await response.text()
      const responseSize = new Blob([responseText]).size

      // Extract response headers
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      const result: HttpResult = {
        id: requestId,
        timestamp: Date.now(),
        method: config.method,
        url: config.url,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        responseSize,
        success: response.ok,
        headers: responseHeaders,
        retryAttempt: retryAttempt > 0 ? retryAttempt : undefined
      }

      return result

    } catch (error: unknown) {
      const endTime = performance.now()
      const responseTime = endTime - startTime

      // Type-safe error handling
      const httpError = error as HttpError

      // Retry mechanism
      const isRetryable = 
        (config.retryCount ?? 0) > retryAttempt && 
        (httpError.name === 'AbortError' || httpError.code === 'ECONNABORTED')

      if (isRetryable) {
        const delay = this.calculateBackoffDelay(retryAttempt, config.backoffStrategy)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        this.retriedRequests++
        
        return this.makeHttpRequest(
          config, 
          requestId, 
          requestIndex, 
          retryAttempt + 1
        )
      }

      return {
        id: requestId,
        timestamp: Date.now(),
        method: config.method,
        url: config.url,
        status: httpError.status || 0,
        statusText: 'Network Error',
        responseTime,
        responseSize: 0,
        success: false,
        error: httpError.message || 'Unknown network error',
        retryAttempt: retryAttempt > 0 ? retryAttempt : undefined
      }
    } finally {
      this.activeRequests.delete(controller)
    }
  }

  private async processRequestQueue(config: Layer7Config): Promise<void> {
    const maxConcurrent = Math.min(config.concurrency, navigator.hardwareConcurrency || 4)
    const activePromises: Promise<void>[] = []

    const processRequest = async (requestIndex: number): Promise<void> => {
      const requestId = `l7-${Date.now()}-${requestIndex}-${Math.random().toString(36).substr(2, 9)}`
      
      try {
        const result = await this.makeHttpRequest(config, requestId, requestIndex)
        this.results.push(result)
        this.onResult(result)

        this.completedCount++
        const progress = (this.completedCount / config.totalRequests) * 100
        this.onProgress(progress)
        
        this.updateStats(config)

        // Optional: Implement adaptive throttling
        if (result.responseTime > config.timeout * 0.8) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }

      } catch (error) {
        console.error(`HTTP request ${requestIndex} failed:`, error)
      }
    }

    // Graceful concurrency management
    while (this.requestQueue.length > 0 && this.isRunning && !this.isPaused) {
      // Maintain max concurrent requests with dynamic scheduling
      while (
        activePromises.length < maxConcurrent && 
        this.requestQueue.length > 0
      ) {
        const requestIndex = this.requestQueue.shift()!
        const promise = processRequest(requestIndex).then(() => {
          const index = activePromises.indexOf(promise)
          if (index > -1) activePromises.splice(index, 1)
        })
        activePromises.push(promise)
      }

      // Wait for at least one request to complete or yield
      if (activePromises.length > 0) {
        await Promise.race(activePromises)
      }

      // Yield to event loop to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    // Wait for all remaining requests to complete
    await Promise.all(activePromises)
  }

  async startTest(config: Layer7Config): Promise<void> {
    // Memory and performance optimization
    this.isRunning = true
    this.isPaused = false
    this.startTime = Date.now()
    this.results = []
    this.completedCount = 0
    this.retriedRequests = 0

    // Normalize configuration
    const normalizedConfig: Layer7Config = {
      ...config,
      concurrency: Math.min(config.concurrency, navigator.hardwareConcurrency || 4),
      timeout: Math.max(1000, config.timeout || 5000),
      retryCount: config.retryCount ?? 2,
      backoffStrategy: config.backoffStrategy ?? 'exponential'
    }

    // Setup request queue with performance consideration
    this.requestQueue = Array.from({ length: normalizedConfig.totalRequests }, (_, i) => i)

    try {
      await this.processRequestQueue(normalizedConfig)
    } catch (error) {
      console.error('Layer 7 test execution error:', error)
    } finally {
      if (this.isRunning) {
        this.stopTest()
        this.onComplete?.()
      }
    }
  }

  pauseTest(): void {
    this.isPaused = true
    
    // Graceful request cancellation
    this.activeRequests.forEach(controller => {
      try {
        controller.abort('Test paused')
      } catch (error) {
        console.warn('Error aborting request:', error)
      }
    })
    this.activeRequests.clear()

    // Clear any pending timeouts
    this.requestTimeouts.forEach(timeout => clearTimeout(timeout))
    this.requestTimeouts.clear()
  }

  resumeTest(config: Layer7Config): void {
    if (this.completedCount < config.totalRequests) {
      this.isPaused = false
      this.processRequestQueue(config)
    }
  }

  stopTest(): void {
    this.isRunning = false
    this.isPaused = false
    
    // Comprehensive cleanup
    this.activeRequests.forEach(controller => {
      try {
        controller.abort('Test stopped')
      } catch (error) {
        console.warn('Error aborting request:', error)
      }
    })
    this.activeRequests.clear()

    // Clear timeouts
    this.requestTimeouts.forEach(timeout => clearTimeout(timeout))
    this.requestTimeouts.clear()

    // Clear request queue
    this.requestQueue = []

    // Final stats update
    if (this.results.length > 0) {
      this.updateStats()
    }

    // Optional memory hint
    if (window.gc) {
      window.gc()
    }
  }

  private updateStats(config?: Layer7Config): void {
    const successful = this.results.filter(r => r.success)
    const clientErrors = this.results.filter(r => r.status >= 400 && r.status < 500)
    const serverErrors = this.results.filter(r => r.status >= 500 && r.status < 600)
    const networkErrors = this.results.filter(r => r.status === 0)
    const retriedRequests = this.results.filter(r => r.retryAttempt !== undefined)
    
    const responseTimes = this.results.map(r => r.responseTime)
    const totalSize = this.results.reduce((sum, r) => sum + r.responseSize, 0)
    const elapsedTime = Date.now() - this.startTime

    const stats: Layer7Stats = {
      totalRequests: config?.totalRequests || this.results.length,
      completedRequests: this.results.length,
      successfulRequests: successful.length,
      clientErrors: clientErrors.length,
      serverErrors: serverErrors.length,
      networkErrors: networkErrors.length,
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      requestsPerSecond: elapsedTime > 0 ? this.results.length / (elapsedTime / 1000) : 0,
      totalDataTransferred: totalSize,
      throughput: elapsedTime > 0 ? totalSize / (elapsedTime / 1000) : 0,
      retries: retriedRequests.length
    }

    this.onStats(stats)
  }

  getResults(): HttpResult[] {
    return [...this.results]
  }

  getStats(): Layer7Stats | null {
    if (this.results.length === 0) return null
    
    const successful = this.results.filter(r => r.success)
    const clientErrors = this.results.filter(r => r.status >= 400 && r.status < 500)
    const serverErrors = this.results.filter(r => r.status >= 500 && r.status < 600)
    const networkErrors = this.results.filter(r => r.status === 0)
    const retriedRequests = this.results.filter(r => r.retryAttempt !== undefined)
    
    const responseTimes = this.results.map(r => r.responseTime)
    const totalSize = this.results.reduce((sum, r) => sum + r.responseSize, 0)
    const elapsedTime = Date.now() - this.startTime

    return {
      totalRequests: this.results.length,
      completedRequests: this.results.length,
      successfulRequests: successful.length,
      clientErrors: clientErrors.length,
      serverErrors: serverErrors.length,
      networkErrors: networkErrors.length,
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      requestsPerSecond: elapsedTime > 0 ? this.results.length / (elapsedTime / 1000) : 0,
      totalDataTransferred: totalSize,
      throughput: elapsedTime > 0 ? totalSize / (elapsedTime / 1000) : 0,
      retries: retriedRequests.length
    }
  }

  exportResults(): string {
    const data = {
      stats: this.getStats(),
      results: this.results,
      timestamp: new Date().toISOString(),
    }

    return JSON.stringify(data, null, 2)
  }

  cleanup(): void {
    this.stopTest()
    this.results = []
    this.requestQueue = []
    this.completedCount = 0
    this.retriedRequests = 0
    this.requestTimeouts.clear()
    
    // Aggressive memory cleanup
    if (window.gc) {
      try {
        window.gc()
      } catch {
        // Graceful fallback if gc is not accessible
        console.warn('Manual garbage collection not available')
      }
    }

    // Optional: Trigger potential memory release in browsers
    if (typeof window !== 'undefined') {
      // Nullify references
      this.onResult = () => {}
      this.onStats = () => {}
      this.onProgress = () => {}
      this.onComplete = undefined
    }
  }

  // Advanced performance and memory management utility
  private optimizeMemoryUsage(): void {
    // Trim results to prevent excessive memory usage
    if (this.results.length > 10000) {
      this.results = this.results.slice(-10000)
    }

    this.activeRequests.forEach(controller => {
      try {
        controller.abort('Memory optimization')
      } catch {
        // Silent catch for abort errors during cleanup
      }
    })
    this.activeRequests.clear()
  }

  // Adaptive performance monitoring
  private monitorPerformance(): void {
    const currentTime = Date.now()
    const elapsedTime = currentTime - this.startTime

    // Check for potential performance bottlenecks
    if (elapsedTime > 60000) { // 1 minute threshold
      console.warn('Long-running test detected. Considering optimization strategies.')
      this.optimizeMemoryUsage()
    }

    // Complex performance analysis
    const stats = this.getStats()
    if (stats) {
      const performanceThresholds = {
        slowRequestThreshold: this.results.length > 100 
          ? Math.max(1000, stats.averageResponseTime * 2)
          : 2000,
        errorRateThreshold: 0.2 // 20% error rate
      }

      const slowRequests = this.results.filter(r => 
        r.responseTime > performanceThresholds.slowRequestThreshold
      )

      const errorRate = (stats.clientErrors + stats.serverErrors + stats.networkErrors) / stats.totalRequests

      if (slowRequests.length > 0) {
        console.warn(`Detected ${slowRequests.length} slow requests`, slowRequests)
      }

      if (errorRate > performanceThresholds.errorRateThreshold) {
        console.warn(`High error rate detected: ${(errorRate * 100).toFixed(2)}%`)
      }
    }
  }

  // Enhanced error handling and logging
  private logPerformanceInsights(): void {
    const stats = this.getStats()
    if (stats) {
      console.group('Layer 7 Test Performance Insights')
      console.log('Total Requests:', stats.totalRequests)
      console.log('Successful Requests:', stats.successfulRequests)
      console.log('Average Response Time:', stats.averageResponseTime.toFixed(2) + 'ms')
      console.log('Requests per Second:', stats.requestsPerSecond.toFixed(2))
      console.log('Total Data Transferred:', 
        (stats.totalDataTransferred / 1024).toFixed(2) + ' KB'
      )
      console.log('Throughput:', 
        (stats.throughput / 1024).toFixed(2) + ' KB/s'
      )
      console.log('Retried Requests:', stats.retries)
      console.groupEnd()
    }
  }

  // Optional telemetry method for advanced insights
  sendPerformanceTelemetry(): void {
    const stats = this.getStats()
    if (stats) {
      try {
        // Example telemetry - replace with your actual telemetry service
        navigator.sendBeacon('/telemetry/layer7', JSON.stringify({
          timestamp: new Date().toISOString(),
          ...stats,
          userAgent: navigator.userAgent,
          hardwareConcurrency: navigator.hardwareConcurrency
        }))
      } catch (error) {
        console.error('Telemetry transmission failed', error)
      }
    }
  }
}