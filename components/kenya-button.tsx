"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface KenyaButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "danger" | "success"
  disabled?: boolean
  className?: string
  size?: "sm" | "md" | "lg"
}

export function KenyaButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className,
  size = "md",
}: KenyaButtonProps) {
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
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative overflow-hidden rounded-xl font-semibold transition-all duration-300",
        "transform hover:scale-105 active:scale-95",
        "backdrop-blur-sm",
        variants[variant],
        sizes[size],
        disabled && "opacity-50 cursor-not-allowed hover:scale-100",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </Button>
  )
}
