"use client"

import { useEffect, useState } from "react"
import { Cpu, HardDrive, Wifi, Activity } from "lucide-react"
import { GlassCard } from "./glass-card"

interface SystemStats {
  cpuUsage: number
  memoryUsage: number
  networkLatency: number
  activeConnections: number
}

export function SystemMonitor() {
  const [stats, setStats] = useState<SystemStats>({
    cpuUsage: 0,
    memoryUsage: 0,
    networkLatency: 0,
    activeConnections: 0,
  })

  const [isMonitoring, setIsMonitoring] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout

    const startMonitoring = () => {
      setIsMonitoring(true)

      interval = setInterval(() => {
        // Simulate system resource monitoring
        const cpuUsage = Math.min(100, Math.max(0, stats.cpuUsage + (Math.random() - 0.5) * 10))
        const memoryUsage = Math.min(100, Math.max(0, stats.memoryUsage + (Math.random() - 0.5) * 5))
        const networkLatency = Math.max(1, stats.networkLatency + (Math.random() - 0.5) * 20)
        const activeConnections = Math.max(0, stats.activeConnections + Math.floor((Math.random() - 0.5) * 3))

        setStats({
          cpuUsage,
          memoryUsage,
          networkLatency,
          activeConnections,
        })
      }, 1000)
    }

    // Start monitoring when component mounts
    startMonitoring()

    return () => {
      if (interval) {
        clearInterval(interval)
      }
      setIsMonitoring(false)
    }
  }, [])

  const getStatusColor = (value: number, type: "cpu" | "memory" | "latency") => {
    if (type === "latency") {
      if (value < 50) return "text-green-600 dark:text-green-400"
      if (value < 100) return "text-yellow-600 dark:text-yellow-400"
      return "text-red-600 dark:text-red-400"
    }

    if (value < 50) return "text-green-600 dark:text-green-400"
    if (value < 80) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  return (
    <GlassCard className="p-3 sm:p-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20">
            <Cpu className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-xs sm:text-sm font-bold ${getStatusColor(stats.cpuUsage, "cpu")}`}>
              {stats.cpuUsage.toFixed(1)}%
            </div>
            <div className="text-xs text-readable-light truncate">CPU</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20">
            <HardDrive className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-xs sm:text-sm font-bold ${getStatusColor(stats.memoryUsage, "memory")}`}>
              {stats.memoryUsage.toFixed(1)}%
            </div>
            <div className="text-xs text-readable-light truncate">RAM</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-black/20 to-gray-600/20">
            <Wifi className="h-3 w-3 sm:h-4 sm:w-4 text-gray-800 dark:text-gray-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-xs sm:text-sm font-bold ${getStatusColor(stats.networkLatency, "latency")}`}>
              {stats.networkLatency.toFixed(0)}ms
            </div>
            <div className="text-xs text-readable-light truncate">Ping</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-red-500/20 to-green-500/20">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-green-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-bold text-readable-dark">{stats.activeConnections}</div>
            <div className="text-xs text-readable-light truncate">Conn</div>
          </div>
        </div>
      </div>

      {isMonitoring && (
        <div className="mt-2 flex items-center justify-center">
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Monitoring</span>
          </div>
        </div>
      )}
    </GlassCard>
  )
}
