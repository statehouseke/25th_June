// app/dashboard/components/target-management.tsx - Enhanced version with fallback UI
"use client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ResponsiveButton } from "@/components/responsive-button"
import {
  Target,
  RefreshCw,
  List,
  Plus,
  Minus,
  AlertCircle,
  ExternalLink,
  Info
} from "lucide-react"
import { TestMode, TargetInfo, EnhancedLayer7Config, EnhancedLayer4Config } from "@/lib/types"

interface TargetManagementProps {
  testMode: TestMode
  layer7Config: EnhancedLayer7Config
  layer4Config: EnhancedLayer4Config
  setLayer7Config: React.Dispatch<React.SetStateAction<EnhancedLayer7Config>>
  setLayer4Config: React.Dispatch<React.SetStateAction<EnhancedLayer4Config>>
  defaultTargets: string[]
  isLoadingTargets: boolean
  targetInfoMap: Map<string, TargetInfo>
  customTargetInput: string
  setCustomTargetInput: React.Dispatch<React.SetStateAction<string>>
  isRunning: boolean
  getCurrentTargets: () => string[]
  addCustomTarget: () => void
  removeCustomTarget: (target: string) => void
}

export function TargetManagement({
  testMode,
  layer7Config,
  layer4Config,
  setLayer7Config,
  setLayer4Config,
  defaultTargets,
  isLoadingTargets,
  targetInfoMap,
  customTargetInput,
  setCustomTargetInput,
  isRunning,
  getCurrentTargets,
  addCustomTarget,
  removeCustomTarget
}: TargetManagementProps) {
  const currentConfig = testMode === "layer7" ? layer7Config : layer4Config
  const hasDefaultTargets = defaultTargets.length > 0
  const hasCustomTargets = currentConfig.customTargets.length > 0
  const totalTargets = getCurrentTargets().length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-readable-dark font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Target Management
        </Label>
        {isLoadingTargets && (
          <div className="flex items-center gap-2 text-xs text-readable-muted">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Loading...
          </div>
        )}
      </div>

      {/* Default Targets Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-black/30">
        <div className="flex items-center gap-2">
          <List className="h-4 w-4 text-readable-muted" />
          <span className="text-sm font-medium text-readable-dark">Use Default Targets</span>
          {hasDefaultTargets ? (
            <Badge variant="secondary" className="text-xs">
              {defaultTargets.length} available
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              Unavailable
            </Badge>
          )}
        </div>
        <button
          onClick={() => {
            if (testMode === "layer7") {
              setLayer7Config(prev => ({ ...prev, useDefaultTargets: !prev.useDefaultTargets }))
            } else {
              setLayer4Config(prev => ({ ...prev, useDefaultTargets: !prev.useDefaultTargets }))
            }
          }}
          disabled={isRunning || !hasDefaultTargets}
          className={`w-12 h-6 rounded-full transition-all ${
            currentConfig.useDefaultTargets && hasDefaultTargets
              ? "bg-green-500"
              : "bg-gray-300 dark:bg-gray-600"
          } disabled:opacity-50`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
            currentConfig.useDefaultTargets && hasDefaultTargets ? "translate-x-6" : "translate-x-0"
          }`} />
        </button>
      </div>

      {/* Default Targets Status */}
      {!hasDefaultTargets && !isLoadingTargets && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Default targets unavailable
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Unable to load targets from GitHub. Please add custom targets below to get started.
            </p>
            <a 
              href="https://raw.githubusercontent.com/statehouseke/STOP-IT/main/file.txt" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 hover:underline mt-2"
            >
              <ExternalLink className="h-3 w-3" />
              View target source
            </a>
          </div>
        </div>
      )}

      {/* Target Rotation Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-readable-dark font-medium text-xs">Target Rotation</Label>
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-black/30">
            <span className="text-xs text-readable-dark">Auto-rotate</span>
            <button
              onClick={() => {
                if (testMode === "layer7") {
                  setLayer7Config(prev => ({ ...prev, targetRotationEnabled: !prev.targetRotationEnabled }))
                } else {
                  setLayer4Config(prev => ({ ...prev, targetRotationEnabled: !prev.targetRotationEnabled }))
                }
              }}
              disabled={isRunning}
              className={`w-10 h-5 rounded-full transition-all ${
                currentConfig.targetRotationEnabled
                  ? "bg-green-500"
                  : "bg-gray-300 dark:bg-gray-600"
              } disabled:opacity-50`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                currentConfig.targetRotationEnabled ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-readable-dark font-medium text-xs">Max Failures</Label>
          <Input
            type="number"
            value={currentConfig.maxFailuresPerTarget}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 10
              if (testMode === "layer7") {
                setLayer7Config(prev => ({ ...prev, maxFailuresPerTarget: value }))
              } else {
                setLayer4Config(prev => ({ ...prev, maxFailuresPerTarget: value }))
              }
            }}
            disabled={isRunning}
            className="bg-white/70 dark:bg-black/50 h-8 text-xs"
            min="1"
            max="100"
          />
        </div>
      </div>

      {/* Custom Targets */}
      <div className="space-y-2">
        <Label className="text-readable-dark font-medium text-sm">Custom Targets</Label>
        <div className="flex gap-2">
          <Textarea
            value={customTargetInput}
            onChange={(e) => setCustomTargetInput(e.target.value)}
            placeholder={testMode === "layer7" 
              ? "https://example.com\nhttps://api.example.com\n192.168.1.1:8080" 
              : "example.com:80\n192.168.1.1:443\nexample.com"
            }
            disabled={isRunning}
            rows={3}
            className="bg-white/70 dark:bg-black/50 text-xs flex-1 resize-none"
          />
          <div className="flex flex-col gap-1">
            <ResponsiveButton
              onClick={addCustomTarget}
              disabled={!customTargetInput.trim() || isRunning}
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Plus className="h-3 w-3" />
            </ResponsiveButton>
          </div>
        </div>
        
        {/* Helper text for custom targets */}
        <div className="flex items-start gap-2 p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <Info className="h-3 w-3 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {testMode === "layer7" 
              ? "Add HTTP/HTTPS URLs (one per line). Examples: https://example.com, http://192.168.1.1:8080"
              : "Add domains with ports (one per line). Examples: example.com:80, 192.168.1.1:443"
            }
          </p>
        </div>
      </div>

      {/* Custom Targets List */}
      {hasCustomTargets && (
        <div className="space-y-2">
          <Label className="text-readable-dark font-medium text-sm">Added Targets</Label>
          <ScrollArea className="h-24 border rounded-lg bg-white/50 dark:bg-black/30">
            <div className="p-2 space-y-1">
              {currentConfig.customTargets.map((target, index) => {
                const info = targetInfoMap.get(target)
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded bg-white/70 dark:bg-black/50 text-xs"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full ${
                        info?.isActive !== false ? "bg-green-500" : "bg-red-500"
                      }`} />
                      <span className="font-mono truncate">{target}</span>
                      {info && info.failureCount > 0 && (
                        <Badge variant="destructive" className="text-xs px-1 py-0">
                          {info.failureCount}
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => removeCustomTarget(target)}
                      disabled={isRunning}
                      className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Target Status Summary */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-green-500/10 border border-green-500/20 rounded p-2 text-center">
          <div className="font-bold text-green-600">
            {Array.from(targetInfoMap.values()).filter(info => info.isActive !== false).length}
          </div>
          <div className="text-green-600/80">Active</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-center">
          <div className="font-bold text-red-600">
            {Array.from(targetInfoMap.values()).filter(info => info.isActive === false).length}
          </div>
          <div className="text-red-600/80">Failed</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 text-center">
          <div className="font-bold text-blue-600">{totalTargets}</div>
          <div className="text-blue-600/80">Total</div>
        </div>
      </div>

      {/* No targets warning */}
      {totalTargets === 0 && !isLoadingTargets && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            No targets configured. Add custom targets above to get started.
          </span>
        </div>
      )}
    </div>
  )
}