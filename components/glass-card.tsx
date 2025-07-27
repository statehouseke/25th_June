"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/10",
        "bg-white/10 dark:bg-black/10 backdrop-blur-xl",
        "shadow-xl shadow-black/5 dark:shadow-black/20",
        hover && "transition-all duration-300 hover:bg-white/20 dark:hover:bg-black/20 hover:scale-[1.02]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
