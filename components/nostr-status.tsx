"use client"

import { useState } from "react"
import { Users, Activity, TrendingUp, TrendingDown, Eye, EyeOff, X, Wifi, WifiOff } from "lucide-react"
import { useNostrNetwork } from "@/hooks/use-nostr-connection"

interface NostrStatusProps {
  groupName?: string
  className?: string
}

export function NostrStatus({ groupName = "mkenya-group", className = "" }: NostrStatusProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  
  const {
    isConnected,
    isInitializing,
    connectedRelays,
    totalRelays,
    shortId,
    networkUsers,
    userCount,
    networkStats,
    mySystemInfo,
    errors,
    clearErrors,
    initialize,
    disconnect
  } = useNostrNetwork(groupName)

  // Safe access to system info with fallbacks
  const systemInfo = mySystemInfo || {
    deviceType: 'unknown',
    cpuCores: 1,
    memoryGB: 4,
    networkSpeed: { download: 0, upload: 0, latency: 0 },
    browserEngine: 'unknown',
    capabilities: []
  }

  // Format bandwidth (Mbps)
  const formatBandwidth = (mbps: number): string => {
    if (!mbps || mbps === 0) return '0 Mbps'
    return `${mbps.toFixed(1)} Mbps`
  }

  // Get connection status color
  const getStatusColor = () => {
    if (isInitializing) return "text-yellow-600 dark:text-yellow-400"
    if (isConnected) return "text-green-600 dark:text-green-400"
    return "text-red-600 dark:text-red-400"
  }

  // Get connection status text
  const getStatusText = () => {
    if (isInitializing) return "Connecting..."
    if (isConnected) return "Connected"
    return "Disconnected"
  }

  const handleStatusClick = () => {
    if (!isConnected && !isInitializing) {
      initialize()
    } else {
      setShowDetails(!showDetails)
    }
  }

  // Mobile-first minimized view
  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-lg hover:shadow-xl transition-all"
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{userCount}</span>
            <Eye className="h-3 w-3 text-gray-500" />
          </div>
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Error Display */}
      {errors.length > 0 && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">Network Issues</p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  {errors[errors.length - 1]}
                </p>
                <button
                  onClick={clearErrors}
                  className="text-xs text-red-600 dark:text-red-400 underline mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Floating compact widget */}
      <div className={`md:hidden fixed bottom-4 right-4 z-40 ${className}`}>
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <div className="p-3">
            {/* Mobile Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Network</span>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <EyeOff className="h-3 w-3 text-gray-500" />
                </button>
                
                <button
                  onClick={handleStatusClick}
                  className={`text-xs px-2 py-1 rounded ${getStatusColor()} bg-gray-100 dark:bg-gray-800`}
                >
                  {getStatusText()}
                </button>
              </div>
            </div>

            {/* Mobile Stats - Compact */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-blue-600" />
                <span className="font-bold text-gray-800 dark:text-gray-200">{userCount}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-green-600" />
                <span className="font-mono text-gray-600">
                  {formatBandwidth(systemInfo.networkSpeed.download)}
                </span>
              </div>
              
              {isConnected && (
                <button
                  onClick={() => setShowDetails(true)}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Details
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Original larger widget */}
      <div className={`hidden md:block fixed bottom-4 right-4 z-40 ${className}`}>
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nostr Network
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <EyeOff className="h-3 w-3 text-gray-500" />
                </button>
                
                <button
                  onClick={handleStatusClick}
                  className={`text-xs px-2 py-1 rounded ${getStatusColor()} bg-gray-100 dark:bg-gray-800`}
                >
                  {getStatusText()}
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Users Online */}
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg p-3 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Online</span>
                </div>
                <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {userCount}
                </div>
                <div className="text-xs text-gray-500">
                  Peak: {networkStats.peakUsers}
                </div>
              </div>

              {/* Network Activity */}
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg p-3 border border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Speed</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                    {formatBandwidth(systemInfo.networkSpeed.download)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                    {formatBandwidth(systemInfo.networkSpeed.upload)}
                  </span>
                </div>
              </div>
            </div>

            {/* Device Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Device</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {systemInfo.deviceType} • {systemInfo.cpuCores} cores • {systemInfo.memoryGB}GB
                </span>
              </div>
              {shortId && (
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-600 dark:text-gray-400">ID</span>
                  <span className="font-mono bg-white dark:bg-gray-700 px-2 py-1 rounded border">
                    {shortId}
                  </span>
                </div>
              )}
            </div>

            {/* Connection Info */}
            {isConnected && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Relays: {connectedRelays}/{totalRelays}</span>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showDetails ? 'Hide' : 'Details'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Details Modal - Full Screen */}
      {showDetails && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="absolute inset-x-4 top-16 bottom-16 bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  Network Details
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* My Device Info */}
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">
                    My Device
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 block mb-1">Type</span>
                      <div className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                        {systemInfo.deviceType}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 block mb-1">Performance</span>
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {systemInfo.cpuCores} cores, {systemInfo.memoryGB}GB
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 block mb-1">Network Speed</span>
                      <div className="font-mono text-gray-800 dark:text-gray-200">
                        ↓ {formatBandwidth(systemInfo.networkSpeed.download)}
                      </div>
                      <div className="font-mono text-gray-800 dark:text-gray-200">
                        ↑ {formatBandwidth(systemInfo.networkSpeed.upload)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 block mb-1">Latency</span>
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {systemInfo.networkSpeed.latency}ms
                      </div>
                    </div>
                  </div>
                </div>

                {/* Network Stats */}
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-4 border border-blue-500/20">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">
                    Network Statistics
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 block mb-1">Total Bandwidth</span>
                      <div className="font-mono text-gray-800 dark:text-gray-200">
                        ↑ {formatBandwidth(networkStats.totalBandwidth.upload)}
                      </div>
                      <div className="font-mono text-gray-800 dark:text-gray-200">
                        ↓ {formatBandwidth(networkStats.totalBandwidth.download)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 block mb-1">Users</span>
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        Current: {userCount}
                      </div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        Peak: {networkStats.peakUsers}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connected Users */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Connected Users ({userCount})
                  </h4>

                  <div className="space-y-2">
                    {/* Self */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <div>
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            You ({systemInfo.deviceType})
                          </div>
                          <div className="text-xs text-gray-500">
                            {systemInfo.cpuCores} cores, {systemInfo.memoryGB}GB RAM
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
                        {shortId}
                      </div>
                    </div>

                    {/* Other Users */}
                    {Array.from(networkUsers.values()).map((user) => (
                      <div
                        key={user.pubkey}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <div>
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {user.systemInfo.deviceType} device
                            </div>
                            <div className="text-xs text-gray-500">
                              {user.systemInfo.cpuCores} cores, {user.systemInfo.memoryGB}GB • 
                              Online for {Math.floor((Date.now() - user.connectionTime) / 60000)}m
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
                            {user.shortId}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatBandwidth(user.systemInfo.networkSpeed.download)}↓
                          </div>
                        </div>
                      </div>
                    ))}

                    {networkUsers.size === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Wifi className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Waiting for other devices...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connection Status */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">
                    Connection Status
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status</span>
                      <span className={`font-medium ${getStatusColor()}`}>
                        {getStatusText()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Relays</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {connectedRelays}/{totalRelays}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Protocol</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        Nostr (Decentralized)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Browser</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {systemInfo.browserEngine}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Privacy Notice */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                        Privacy Protected
                      </h5>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Your identity is anonymous. Only system performance data and temporary network ID are shared.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={disconnect}
                  className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Disconnect from Network
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Details Panel */}
      {showDetails && isConnected && (
        <div className="hidden md:block">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setShowDetails(false)}
          />
          
          {/* Panel */}
          <div className="absolute bottom-full right-0 mb-2 w-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-40">
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  Network Details
                </h3>
                <button
                  onClick={disconnect}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  Disconnect
                </button>
              </div>

              {/* Device Info */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-3 border border-purple-500/20">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">My Device</h4>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                      {systemInfo.deviceType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Performance:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {systemInfo.cpuCores} cores, {systemInfo.memoryGB}GB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Speed:</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">
                      {formatBandwidth(systemInfo.networkSpeed.download)}↓/{formatBandwidth(systemInfo.networkSpeed.upload)}↑
                    </span>
                  </div>
                </div>
              </div>

              {/* Network Stats */}
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-3 border border-blue-500/20">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Network Statistics</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Users</span>
                    <div className="font-medium text-gray-800 dark:text-gray-200">Current: {userCount}</div>
                    <div className="font-medium text-gray-800 dark:text-gray-200">Peak: {networkStats.peakUsers}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Devices</span>
                    {Object.entries(networkStats.deviceDistribution).map(([device, count]) => (
                      <div key={device} className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                        {device}: {count}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}