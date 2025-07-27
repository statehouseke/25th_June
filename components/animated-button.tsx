"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface AnimatedButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "danger" | "success"
  disabled?: boolean
  className?: string
  size?: "sm" | "md" | "lg"
}

export function AnimatedButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className,
  size = "md",
}: AnimatedButtonProps) {
  const variants = {
    primary:
      "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25",
    secondary:
      "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-lg shadow-gray-500/25",
    danger:
      "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg shadow-red-500/25",
    success:
      "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25",
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
        "border-0 backdrop-blur-sm",
        variants[variant],
        sizes[size],
        disabled && "opacity-50 cursor-not-allowed hover:scale-100",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </Button>
  )
}
