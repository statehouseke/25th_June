"use client"

import { useEffect, useState } from "react"

interface SpeedGaugeProps {
  value: number
  maxValue: number
  label: string
  unit: string
  color?: string
}

export function SpeedGauge({ value, maxValue, label, unit, color = "#3b82f6" }: SpeedGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value)
    }, 100)
    return () => clearTimeout(timer)
  }, [value])

  const percentage = Math.min((animatedValue / maxValue) * 100, 100)
  const strokeDasharray = 2 * Math.PI * 45
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-200 dark:text-gray-700 opacity-20"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out drop-shadow-lg"
          style={{
            filter: `drop-shadow(0 0 8px ${color}40)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          {animatedValue.toFixed(1)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{unit}</div>
      </div>
      <div className="text-center mt-2">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</div>
      </div>
    </div>
  )
}
