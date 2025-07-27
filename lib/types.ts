// lib/types.ts

export type TestMode = "layer7" | "layer4"

export interface TargetInfo {
  url: string
  failureCount: number
  lastSuccess: number
  isActive: boolean
  responseTime: number
}

// Layer 7 Types
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

// Layer 4 Types
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
  status: "connected" | "failed" | "timeout" | "duplicate"
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

// Enhanced Configs
export interface EnhancedLayer7Config extends Omit<Layer7Config, 'url'> {
  targets: string[]
  customTargets: string[]
  useDefaultTargets: boolean
  targetRotationEnabled: boolean
  maxFailuresPerTarget: number
}

export interface EnhancedLayer4Config extends Omit<Layer4Config, 'target'> {
  targets: string[]
  customTargets: string[]
  useDefaultTargets: boolean
  targetRotationEnabled: boolean
  maxFailuresPerTarget: number
}

// Dashboard State
export interface DashboardState {
  testMode: TestMode
  isRunning: boolean
  isPaused: boolean
  elapsedTime: number
  progress: number
  currentTargetIndex: number
  
  // Results
  layer7Results: HttpResult[]
  layer4Results: ConnectionResult[]
  filteredResults: (HttpResult | ConnectionResult)[]
  
  // Stats
  layer7Stats: Layer7Stats
  layer4Stats: Layer4Stats
  
  // Targets
  defaultTargets: string[]
  isLoadingTargets: boolean
  targetInfoMap: Map<string, TargetInfo>
  
  // Config
  layer7Config: EnhancedLayer7Config
  layer4Config: EnhancedLayer4Config
  customRequestCount: number
  customConnectionCount: number
  customTargetInput: string
  
  // User info
  userIP: string
}