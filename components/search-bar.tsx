"use client"

import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { useState } from "react"

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  className?: string
}

export function SearchBar({ placeholder = "Search requests...", onSearch, className }: SearchBarProps) {
  const [query, setQuery] = useState("")

  const handleSearch = (value: string) => {
    setQuery(value)
    onSearch?.(value)
  }

  const clearSearch = () => {
    setQuery("")
    onSearch?.("")
  }

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-center">
        <Search className="absolute left-4 h-5 w-5 text-gray-400 dark:text-gray-500 z-10" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className={`
            pl-12 pr-12 py-3 rounded-xl border-0
            bg-white/10 dark:bg-black/10 backdrop-blur-xl
            border border-white/20 dark:border-white/10
            text-gray-900 dark:text-gray-100
            placeholder:text-gray-500 dark:placeholder:text-gray-400
            focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
            transition-all duration-300
            ${className}
          `}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
