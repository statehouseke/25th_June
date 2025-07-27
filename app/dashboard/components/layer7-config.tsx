// app/dashboard/components/layer7-config.tsx
"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { EnhancedLayer7Config } from "@/lib/types"

interface Layer7ConfigProps {
  config: EnhancedLayer7Config
  setConfig: React.Dispatch<React.SetStateAction<EnhancedLayer7Config>>
  customRequestCount: number
  setCustomRequestCount: React.Dispatch<React.SetStateAction<number>>
  isRunning: boolean
}

export function Layer7Config({
  config,
  setConfig,
  customRequestCount,
  setCustomRequestCount,
  isRunning
}: Layer7ConfigProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-readable-dark font-medium text-sm">HTTP Method</Label>
          <Select
            value={config.method}
            onValueChange={(value: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS") => 
              setConfig((prev) => ({ ...prev, method: value }))
            }
            disabled={isRunning}
          >
            <SelectTrigger className="bg-white/70 dark:bg-black/50 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="HEAD">HEAD</SelectItem>
              <SelectItem value="OPTIONS">OPTIONS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-readable-dark font-medium text-sm">Concurrency</Label>
          <Input
            type="number"
            value={config.concurrency}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, concurrency: parseInt(e.target.value) || 1 }))
            }
            disabled={isRunning}
            className="bg-white/70 dark:bg-black/50 h-9 text-sm"
            min="1"
            max="50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-readable-dark font-medium text-sm">Total Requests</Label>
          <Select
            value={config.totalRequests === -1 ? "unlimited" : "custom"}
            onValueChange={(value) => {
              if (value === "unlimited") {
                setConfig((prev) => ({ ...prev, totalRequests: -1 }))
              } else {
                setConfig((prev) => ({ ...prev, totalRequests: customRequestCount }))
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
          {config.totalRequests !== -1 && (
            <Input
              type="number"
              value={customRequestCount}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1
                setCustomRequestCount(value)
                setConfig((prev) => ({ ...prev, totalRequests: value }))
              }}
              disabled={isRunning}
              className="bg-white/70 dark:bg-black/50 h-8 text-sm"
              placeholder="Enter number of requests"
              min="1"
            />
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-readable-dark font-medium text-sm">Operation Duration</Label>
          <Select
            value={config.timeout.toString()}
            onValueChange={(value) =>
              setConfig((prev) => ({ ...prev, timeout: parseInt(value) }))
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

      {config.method !== "GET" && config.method !== "HEAD" && (
        <div className="space-y-2">
          <Label className="text-readable-dark font-medium text-sm">Request Body</Label>
          <Textarea
            value={config.body}
            onChange={(e) => setConfig((prev) => ({ ...prev, body: e.target.value }))}
            placeholder='{"key": "value"}'
            disabled={isRunning}
            rows={3}
            className="bg-white/70 dark:bg-black/50 text-sm resize-none"
          />
        </div>
      )}
    </>
  )
}