// app/dashboard/components/results-panel.tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ResponsiveButton } from "@/components/responsive-button"
import { SearchBar } from "@/components/search-bar"
import {
  Activity,
  BarChart3,
  Target,
  CheckCircle,
  XCircle,
  RotateCcw,
  ExternalLink,
} from "lucide-react"
import { 
  TestMode, 
  HttpResult, 
  ConnectionResult, 
  Layer7Stats, 
  Layer4Stats, 
  TargetInfo 
} from "@/lib/types"

interface ResultsPanelProps {
  testMode: TestMode
  isRunning: boolean
  currentResults: (HttpResult | ConnectionResult)[]
  layer7Stats: Layer7Stats
  layer4Stats: Layer4Stats
  targetInfoMap: Map<string, TargetInfo>
  getCurrentTargets: () => string[]
  formatTime: (ms: number) => string
  formatBytes: (bytes: number) => string
  handleSearch: (query: string) => void
  setTargetInfoMap: React.Dispatch<React.SetStateAction<Map<string, TargetInfo>>>
}

// Type guard to check if result is HttpResult
const isHttpResult = (result: HttpResult | ConnectionResult): result is HttpResult => {
  return 'method' in result && 'url' in result && 'status' in result;
}

// Type guard to check if result is ConnectionResult  
const isConnectionResult = (result: HttpResult | ConnectionResult): result is ConnectionResult => {
  return 'protocol' in result && 'target' in result && 'port' in result;
}

// Helper function to check if result was successful
const isResultSuccessful = (result: HttpResult | ConnectionResult): boolean => {
  // Check if the result has a success property (common to both types)
  if ('success' in result && typeof result.success === 'boolean') {
    return result.success;
  }
  
  // Fallback logic for type-specific checks
  if (isHttpResult(result)) {
    return result.status >= 200 && result.status < 400;
  } else if (isConnectionResult(result)) {
    // Since ConnectionResult status only has failure states, 
    // if we reach here without a success property, assume it's a failure
    return false;
  }
  return false;
}

export function ResultsPanel({
  testMode,
  isRunning,
  currentResults,
  layer7Stats,
  layer4Stats,
  targetInfoMap,
  getCurrentTargets,
  formatTime,
  formatBytes,
  handleSearch,
  setTargetInfoMap
}: ResultsPanelProps) {
  const currentStats = testMode === "layer7" ? layer7Stats : layer4Stats

  return (
    <Tabs defaultValue="live" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-white/50 dark:bg-black/30 backdrop-blur-xl border border-gray-300 dark:border-gray-600 h-9 sm:h-10">
        <TabsTrigger
          value="live"
          className="data-[state=active]:bg-white/80 dark:data-[state=active]:bg-black/50 text-readable-dark text-xs sm:text-sm"
        >
          Live Feed
        </TabsTrigger>
        <TabsTrigger
          value="stats"
          className="data-[state=active]:bg-white/80 dark:data-[state=active]:bg-black/50 text-readable-dark text-xs sm:text-sm"
        >
          Analytics
        </TabsTrigger>
        <TabsTrigger
          value="targets"
          className="data-[state=active]:bg-white/80 dark:data-[state=active]:bg-black/50 text-readable-dark text-xs sm:text-sm"
        >
          Targets
        </TabsTrigger>
      </TabsList>

      <TabsContent value="live" className="space-y-4">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-readable-dark">
                  Live {testMode === "layer7" ? "Request" : "Connection"} Monitor
                </h3>
              </div>
              {isRunning && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">Live</span>
                </div>
              )}
            </div>

            <ScrollArea className="h-72 sm:h-96">
              <div className="space-y-1 sm:space-y-2">
                {currentResults
                  .slice(-50)
                  .reverse()
                  .map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white/70 dark:hover:bg-black/50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        {testMode === "layer7" && isHttpResult(result) ? (
                          <>
                            <Badge
                              variant={isResultSuccessful(result) ? "default" : "destructive"}
                              className="font-mono text-xs flex-shrink-0"
                            >
                              {result.method}
                            </Badge>
                            <span
                              className={`text-xs sm:text-sm font-mono font-bold flex-shrink-0 ${
                                isResultSuccessful(result)
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {result.status}
                            </span>
                            <span className="text-xs font-mono text-readable-muted truncate">
                              {result.url}
                            </span>
                          </>
                        ) : testMode === "layer4" && isConnectionResult(result) ? (
                          <>
                            <Badge
                              variant={isResultSuccessful(result) ? "default" : "destructive"}
                              className="font-mono text-xs flex-shrink-0"
                            >
                              {result.protocol.toUpperCase()}
                            </Badge>
                            <span
                              className={`text-xs sm:text-sm font-mono font-bold flex-shrink-0 ${
                                isResultSuccessful(result)
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {result.status}
                            </span>
                            <span className="text-xs font-mono text-readable-muted truncate">
                              {result.target}:{result.port}
                            </span>
                          </>
                        ) : null}
                        <span className="text-xs text-readable-muted bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {formatTime(result.responseTime)}
                        </span>
                      </div>
                      <div className="text-xs text-readable-light font-mono flex-shrink-0">
                        {new Date(result.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </div>
                    </div>
                  ))}
                {currentResults.length === 0 && (
                  <div className="text-center text-readable-muted py-8 sm:py-12">
                    <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-base sm:text-lg font-medium">
                      No {testMode === "layer7" ? "requests" : "connections"} yet
                    </p>
                    <p className="text-xs sm:text-sm">Launch an operation to see live results</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="stats" className="space-y-4">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-readable-dark flex items-center gap-2">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
              Detailed Analytics
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-4">
                <div className="text-sm font-semibold text-readable-muted uppercase tracking-wide">
                  Performance Metrics
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center p-2 sm:p-3 rounded-lg bg-white/50 dark:bg-black/30">
                    <span className="text-readable-dark text-sm">Average Response:</span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400 text-sm">
                      {formatTime(currentStats.averageResponseTime)}
                    </span>
                  </div>
                  {testMode === "layer7" && (
                    <>
                      <div className="flex justify-between items-center p-2 sm:p-3 rounded-lg bg-white/50 dark:bg-black/30">
                        <span className="text-readable-dark text-sm">Minimum:</span>
                        <span className="font-mono font-bold text-green-600 dark:text-green-400 text-sm">
                          {formatTime(layer7Stats.minResponseTime)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 sm:p-3 rounded-lg bg-white/50 dark:bg-black/30">
                        <span className="text-readable-dark text-sm">Maximum:</span>
                        <span className="font-mono font-bold text-black dark:text-white text-sm">
                          {formatTime(layer7Stats.maxResponseTime)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center p-2 sm:p-3 rounded-lg bg-white/50 dark:bg-black/30">
                    <span className="text-readable-dark text-sm">Throughput:</span>
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-sm">
                      {testMode === "layer7" 
                        ? `${layer7Stats.requestsPerSecond.toFixed(1)} req/s`
                        : `${layer4Stats.connectionsPerSecond.toFixed(1)} conn/s`
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-semibold text-readable-muted uppercase tracking-wide">
                  Operation Summary
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center p-2 sm:p-3 rounded-lg bg-white/50 dark:bg-black/30">
                    <span className="text-readable-dark text-sm">Successful:</span>
                    <span className="font-mono font-bold text-green-600 dark:text-green-400 text-sm">
                      {testMode === "layer7"
                        ? layer7Stats.successfulRequests
                        : layer4Stats.successfulConnections}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 sm:p-3 rounded-lg bg-white/50 dark:bg-black/30">
                    <span className="text-readable-dark text-sm">Failed:</span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400 text-sm">
                      {testMode === "layer7"
                        ? layer7Stats.clientErrors + layer7Stats.serverErrors + layer7Stats.networkErrors
                        : layer4Stats.failedConnections}
                    </span>
                  </div>
                  {testMode === "layer7" ? (
                    <div className="flex justify-between items-center p-2 sm:p-3 rounded-lg bg-white/50 dark:bg-black/30">
                      <span className="text-readable-dark text-sm">Data Transferred:</span>
                      <span className="font-mono font-bold text-black dark:text-white text-sm">
                        {formatBytes(layer7Stats.totalDataTransferred)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center p-2 sm:p-3 rounded-lg bg-white/50 dark:bg-black/30">
                      <span className="text-readable-dark text-sm">Timeouts:</span>
                      <span className="font-mono font-bold text-yellow-600 dark:text-yellow-400 text-sm">
                        {layer4Stats.timeoutConnections}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-2 sm:p-3 rounded-lg bg-white/50 dark:bg-black/30">
                    <span className="text-readable-dark text-sm">Retries:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {currentStats.retries || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Success Rate Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-readable-dark">Success Rate</span>
                <span className="text-sm font-mono text-readable-muted">
                  {testMode === "layer7" 
                    ? layer7Stats.totalRequests > 0 
                      ? ((layer7Stats.successfulRequests / layer7Stats.totalRequests) * 100).toFixed(1)
                      : "0.0"
                    : layer4Stats.totalConnections > 0
                      ? ((layer4Stats.successfulConnections / layer4Stats.totalConnections) * 100).toFixed(1)
                      : "0.0"
                  }%
                </span>
              </div>
              <Progress 
                value={
                  testMode === "layer7" 
                    ? layer7Stats.totalRequests > 0 
                      ? (layer7Stats.successfulRequests / layer7Stats.totalRequests) * 100
                      : 0
                    : layer4Stats.totalConnections > 0
                      ? (layer4Stats.successfulConnections / layer4Stats.totalConnections) * 100
                      : 0
                } 
                className="h-2" 
              />
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="targets" className="space-y-4">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-bold text-readable-dark flex items-center gap-2">
                <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                Target Status Monitor
              </h3>
              <div className="text-xs sm:text-sm text-readable-muted">
                {getCurrentTargets().length} total targets
              </div>
            </div>

            <SearchBar
              placeholder="Search targets..."
              onSearch={handleSearch}
              className="w-full bg-white/70 dark:bg-black/50 border-gray-300 dark:border-gray-600 text-readable-dark placeholder:text-readable-light"
            />

            <ScrollArea className="h-72 sm:h-96">
              <div className="space-y-2">
                {getCurrentTargets().map((target, index) => {
                  const info = targetInfoMap.get(target)
                  const isActive = info?.isActive !== false
                  const failureCount = info?.failureCount || 0
                  const responseTime = info?.responseTime || 0
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-black/30 hover:bg-white/70 dark:hover:bg-black/50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          isActive ? "bg-green-500 animate-pulse" : "bg-red-500"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-readable-dark truncate">{target}</div>
                          {responseTime > 0 && (
                            <div className="text-xs text-readable-muted">
                              Last: {formatTime(responseTime)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {failureCount > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="text-xs px-2 py-0"
                            >
                              {failureCount} fails
                            </Badge>
                          )}
                          {isActive ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // Reset target failures
                          setTargetInfoMap(prev => {
                            const newMap = new Map(prev)
                            const targetInfo = newMap.get(target)
                            if (targetInfo) {
                              targetInfo.failureCount = 0
                              targetInfo.isActive = true
                            }
                            return newMap
                          })
                        }}
                        disabled={isRunning || isActive}
                        className="p-2 text-blue-500 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
                {getCurrentTargets().length === 0 && (
                  <div className="text-center text-readable-muted py-8 sm:py-12">
                    <Target className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-base sm:text-lg font-medium">No targets configured</p>
                    <p className="text-xs sm:text-sm">Add targets in the configuration panel</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Target Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <ResponsiveButton
                onClick={() => {
                  // Reset all target failures
                  setTargetInfoMap(prev => {
                    const newMap = new Map(prev)
                    newMap.forEach((info) => {
                      info.failureCount = 0
                      info.isActive = true
                    })
                    return newMap
                  })
                }}
                disabled={isRunning}
                variant="secondary"
                size="sm"
                className="flex-1"
              >
                <RotateCcw className="h-3 w-3 mr-2" />
                Reset All
              </ResponsiveButton>
              <ResponsiveButton
                onClick={() => {
                  window.open('https://raw.githubusercontent.com/statehouseke/STOP-IT/main/file.txt', '_blank')
                }}
                variant="secondary"
                size="sm"
                className="flex-1"
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                View Source
              </ResponsiveButton>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}