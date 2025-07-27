//app/page.tsx
"use client"

import { useState } from "react"
import { GlassCard } from "@/components/glass-card"
import { KenyaButton } from "@/components/kenya-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { NostrStatus } from "@/components/nostr-status"
import { SystemMonitor } from "@/components/system-monitor"
import { ResponsiveButton } from "@/components/responsive-button"
import { useNostrNetwork } from "@/hooks/use-nostr-connection"
import {
  BarChart3,
  Sparkles,
  Users,
  Zap,
  Shield,
  Globe,
  TrendingUp,
  Network,
  Activity,
  Cpu,
  ArrowRight,
  Check,
  MessageCircle,
  Lock,
  Eye,
  Target
} from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  
  // Get real data from Nostr network
  const {
    userCount,
    networkUsers,
    mySystemInfo,
    connectedRelays,
    totalRelays
  } = useNostrNetwork('mkenya-group')

  // Calculate total computational power
  const totalCores = Array.from(networkUsers.values()).reduce(
    (acc, user) => acc + (user.systemInfo.cpuCores || 1),
    mySystemInfo?.cpuCores || 1
  )

  // Calculate uptime percentage based on connected relays
  const uptimePercentage = connectedRelays > 0 ? ((connectedRelays / totalRelays) * 100).toFixed(1) : '0.0'

  const handleGetStarted = () => {
    setIsLoading(true)
    // Navigate to network testing page
    setTimeout(() => {
      window.location.href = "/dashboard"
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-red-50 dark:from-gray-900 dark:via-green-900/20 dark:to-red-900/20 transition-colors duration-500">
      {/* Animated background elements with Kenya colors */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-red-500/20 to-green-500/20 rounded-full blur-3xl float-animation" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-500/20 to-black/20 rounded-full blur-3xl float-animation"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-red-400/10 to-green-400/10 rounded-full blur-3xl float-animation"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-red-600 to-green-600 rounded-xl flex items-center justify-center">
                <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-readable-dark">Ngulusumu Canon</h1>
                <p className="text-xs text-readable-light">Decentralized Security Platform</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="flex-1 sm:flex-initial">
                <SystemMonitor />
              </div>
              <NostrStatus />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="text-center space-y-6 sm:space-y-8">
            {/* Main Hero */}
            <div className="space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-gradient-to-r from-red-500/10 to-green-500/10 border border-red-500/20 dark:border-green-500/20">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-green-400" />
                <span className="text-xs sm:text-sm font-medium text-readable-dark">Powered by Nostr Protocol</span>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-red-600 via-black to-green-600 dark:from-red-400 dark:via-white dark:to-green-400 bg-clip-text text-transparent animate-gradient-kenya">
                  Ngulusumu
                </span>
                <br />
                <span className="text-readable-dark">Canon</span>
              </h1>

              <p className="text-base sm:text-xl md:text-2xl text-readable-muted max-w-3xl mx-auto leading-relaxed px-4">
                Professional cybersecurity platform for decentralized penetration testing, vulnerability assessment, and network security analysis.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
              <ResponsiveButton
                onClick={handleGetStarted}
                variant="primary"
                size="lg"
                disabled={isLoading}
                fullWidth
                className="w-full sm:w-auto sm:min-w-48"
                icon={
                  isLoading ? (
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                  )
                }
              >
                {isLoading ? "Initializing..." : "Launch Security Suite"}
              </ResponsiveButton>

              <Link href="/dashboard" className="w-full sm:w-auto">
                <KenyaButton variant="secondary" size="lg" className="w-full sm:min-w-48">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                  Security Dashboard
                </KenyaButton>
              </Link>

              {/* Telegram Button */}
              <a 
                href="https://t.me/ngulusumu_sec" // You can replace this with your actual Telegram link
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <KenyaButton size="lg" className="w-full sm:min-w-48">
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  Join Community
                </KenyaButton>
              </a>
            </div>

            {/* Real-time Network Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mt-8 sm:mt-12 px-4">
              <GlassCard className="p-4 sm:p-6 text-center hover:scale-105 transition-transform duration-300">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <Users className="h-4 w-4 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-readable-dark">{userCount}</div>
                <div className="text-xs sm:text-sm text-readable-light">Active Operators</div>
              </GlassCard>

              <GlassCard className="p-4 sm:p-6 text-center hover:scale-105 transition-transform duration-300">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <Cpu className="h-4 w-4 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-readable-dark">{totalCores}</div>
                <div className="text-xs sm:text-sm text-readable-light">CPU Cores</div>
              </GlassCard>

              <GlassCard className="p-4 sm:p-6 text-center hover:scale-105 transition-transform duration-300">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-black/20 to-gray-600/20 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-gray-800 dark:text-gray-300" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-readable-dark">{uptimePercentage}%</div>
                <div className="text-xs sm:text-sm text-readable-light">Network Uptime</div>
              </GlassCard>

              <GlassCard className="p-4 sm:p-6 text-center hover:scale-105 transition-transform duration-300">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500/20 to-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <Globe className="h-4 w-4 sm:h-6 sm:w-6 text-red-600 dark:text-green-400" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-readable-dark">{connectedRelays}</div>
                <div className="text-xs sm:text-sm text-readable-light">Active Relays</div>
              </GlassCard>
            </div>
          </div>

          {/* Features Section */}
          <section className="mt-16 sm:mt-24 px-4">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-readable-dark mb-4">Why Choose Ngulusumu Canon?</h2>
              <p className="text-lg sm:text-xl text-readable-muted max-w-2xl mx-auto">
                Enterprise-grade cybersecurity platform built for security professionals and penetration testers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <GlassCard className="p-6 sm:p-8 hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                  <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-readable-dark mb-3 sm:mb-4">Advanced Security</h3>
                <p className="text-readable-muted leading-relaxed text-sm sm:text-base">
                  Comprehensive vulnerability assessment and penetration testing capabilities with real-time threat detection and analysis.
                </p>
              </GlassCard>

              <GlassCard className="p-6 sm:p-8 hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                  <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-readable-dark mb-3 sm:mb-4">Decentralized Network</h3>
                <p className="text-readable-muted leading-relaxed text-sm sm:text-base">
                  Powered by Nostr protocol for true decentralization. Collaborate with security experts worldwide in real-time.
                </p>
              </GlassCard>

              <GlassCard className="p-6 sm:p-8 hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-black/20 to-gray-600/20 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                  <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-gray-800 dark:text-gray-300" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-readable-dark mb-3 sm:mb-4">Real-time Monitoring</h3>
                <p className="text-readable-muted leading-relaxed text-sm sm:text-base">
                  Live monitoring dashboards, live feeds, and collaborative analysis tools for security teams.
                </p>
              </GlassCard>
            </div>
          </section>

          {/* Security Testing Suite */}
          <section className="mt-16 sm:mt-24 px-4">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-readable-dark mb-4">Professional Security Suite</h2>
              <p className="text-lg sm:text-xl text-readable-muted max-w-2xl mx-auto">
                Comprehensive Layer 4 and Layer 7 security analysis tools for penetration testing and vulnerability assessment.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Application Layer Security */}
              <GlassCard className="p-6 sm:p-8 hover:scale-105 transition-all duration-300">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-readable-dark mb-2">Application Security (L7)</h3>
                    <p className="text-readable-muted text-sm sm:text-base leading-relaxed">
                      Advanced HTTP/HTTPS security analysis with vulnerability scanning, injection testing, and authentication bypass detection.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-readable-muted">SQL injection and XSS vulnerability scanning</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-readable-muted">Authentication and authorization testing</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-readable-muted">SSL/TLS security assessment</span>
                  </div>
                </div>

                <Link href="/dashboard">
                  <ResponsiveButton variant="primary" fullWidth>
                    <Shield className="h-4 w-4" />
                    Launch Security Scan
                    <ArrowRight className="h-4 w-4" />
                  </ResponsiveButton>
                </Link>
              </GlassCard>

              {/* Network Layer Security */}
              <GlassCard className="p-6 sm:p-8 hover:scale-105 transition-all duration-300">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Network className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-readable-dark mb-2">Network Security (L4)</h3>
                    <p className="text-readable-muted text-sm sm:text-base leading-relaxed">
                      Deep network analysis and penetration testing at the transport layer with advanced reconnaissance capabilities.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
                    <span className="text-readable-muted">Port scanning and service enumeration</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
                    <span className="text-readable-muted">Firewall and IDS/IPS evasion testing</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
                    <span className="text-readable-muted">Network topology mapping</span>
                  </div>
                </div>

                <Link href="/dashboard">
                  <ResponsiveButton variant="secondary" fullWidth>
                    <Network className="h-4 w-4" />
                    Network Reconnaissance
                    <ArrowRight className="h-4 w-4" />
                  </ResponsiveButton>
                </Link>
              </GlassCard>
            </div>
          </section>

          {/* Security Metrics */}
          <section className="mt-16 sm:mt-24 px-4">
            <GlassCard className="p-6 sm:p-8">
              <div className="text-center mb-8 sm:mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-readable-dark mb-4">Real-Time Canon</h2>
                <p className="text-readable-muted max-w-2xl mx-auto">
                  Comprehensive metrics and analytics from the decentralized network.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-readable-dark">Scan Success</div>
                  <div className="text-xs text-readable-muted">Real-time %</div>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-readable-dark">Response Time</div>
                  <div className="text-xs text-readable-muted">Min/Avg/Max</div>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-readable-dark">Throughput</div>
                  <div className="text-xs text-readable-muted">Scans/sec</div>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-readable-dark">Vulnerabilities</div>
                  <div className="text-xs text-readable-muted">High/Critical</div>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Network className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-readable-dark">Network Load</div>
                  <div className="text-xs text-readable-muted">Mbps Total</div>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Cpu className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-readable-dark">Parallel Ops</div>
                  <div className="text-xs text-readable-muted">Concurrent</div>
                </div>
              </div>
            </GlassCard>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-16 sm:mt-24 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-red-600 to-green-600 rounded-lg flex items-center justify-center">
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
                <span className="font-semibold text-readable-dark">Ngulusumu Canon</span>
              </div>
              <div className="text-xs sm:text-sm text-readable-light text-center sm:text-right">
                Powered by Nostr • Cybersecurity for Professionals
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}