// app/dashboard/components/layer4-config.tsx
"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EnhancedLayer4Config } from "@/lib/types"

interface Layer4ConfigProps {
  config: EnhancedLayer4Config
  setConfig: React.Dispatch<React.SetStateAction<EnhancedLayer4Config>>
  customConnectionCount: number
  setCustomConnectionCount: React.Dispatch<React.SetStateAction<number>>
  isRunning: boolean
}

export function Layer4Config({
  config,
  setConfig,
  customConnectionCount,
  setCustomConnectionCount,
  isRunning
}: Layer4ConfigProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-readable-dark font-medium text-sm">Default Port</Label>
          <Input
            type="number"
            value={config.port}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, port: parseInt(e.target.value) || 80 }))
            }
            disabled={isRunning}
            className="bg-white/70 dark:bg-black/50 h-9 text-sm"
            min="1"
            max="65535"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-readable-dark font-medium text-sm">Protocol</Label>
          <Select
            value={config.protocol}
            onValueChange={(value: "tcp" | "udp") => setConfig((prev) => ({ ...prev, protocol: value }))}
            disabled={isRunning}
          >
            <SelectTrigger className="bg-white/70 dark:bg-black/50 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tcp">TCP</SelectItem>
              <SelectItem value="udp">UDP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-readable-dark font-medium text-sm">Connections</Label>
          <Select
            value={config.connections === -1 ? "unlimited" : "custom"}
            onValueChange={(value) => {
              if (value === "unlimited") {
                setConfig((prev) => ({ ...prev, connections: -1 }))
              } else {
                setConfig((prev) => ({ ...prev, connections: customConnectionCount }))
              }
            }}
            disabled={isRunning}
          >
            <SelectTrigger className="bg-white/70 dark:bg-black/50 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unlimited">Unlimited</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {config.connections !== -1 && (
            <Input
              type="number"
              value={customConnectionCount}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1
                setCustomConnectionCount(value)
                setConfig((prev) => ({ ...prev, connections: value }))
              }}
              disabled={isRunning}
              className="bg-white/70 dark:bg-black/50 h-8 text-sm"
              placeholder="Enter number of connections"
              min="1"
            />
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-readable-dark font-medium text-sm">Operation Duration</Label>
          <Select
            value={(config.duration * 1000).toString()}
            onValueChange={(value) =>
              setConfig((prev) => ({ ...prev, duration: parseInt(value) / 1000 }))
            }
            disabled={isRunning}
          >
            <SelectTrigger className="bg-white/70 dark:bg-black/50 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="300000">5 minutes</SelectItem>
              <SelectItem value="600000">10 minutes</SelectItem>
              <SelectItem value="1800000">30 minutes</SelectItem>
              <SelectItem value="3600000">1 hour</SelectItem>
              <SelectItem value="10800000">3 hours</SelectItem>
              <SelectItem value="21600000">6 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  )
}