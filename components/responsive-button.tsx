"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface ResponsiveButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "danger" | "success"
  disabled?: boolean
  className?: string
  size?: "xs" | "sm" | "md" | "lg"
  fullWidth?: boolean
  icon?: ReactNode
}

export function ResponsiveButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className,
  size = "md",
  fullWidth = false,
  icon,
}: ResponsiveButtonProps) {
  const variants = {
    primary:
      "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/25 border border-red-500/20",
    secondary:
      "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg shadow-gray-500/25 border border-gray-500/20",
    danger:
      "bg-gradient-to-r from-black to-gray-900 hover:from-gray-900 hover:to-black text-white shadow-lg shadow-black/25 border border-gray-700/20",
    success:
      "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-500/25 border border-green-500/20",
  }

  const sizes = {
    xs: "px-2 py-1 text-xs min-h-[28px]",
    sm: "px-3 py-1.5 text-sm min-h-[32px]",
    md: "px-4 py-2 text-sm sm:text-base min-h-[36px] sm:min-h-[40px]",
    lg: "px-6 py-3 text-base sm:text-lg min-h-[44px] sm:min-h-[48px]",
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative overflow-hidden rounded-lg sm:rounded-xl font-semibold transition-all duration-300",
        "transform hover:scale-105 active:scale-95",
        "backdrop-blur-sm flex items-center justify-center gap-1 sm:gap-2",
        "whitespace-nowrap text-ellipsis",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      <span className="relative z-10 flex items-center gap-1 sm:gap-2 min-w-0">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="truncate">{children}</span>
      </span>
    </Button>
  )
}
