"use client"

import { useEffect, useRef } from "react"

interface ResourceCleanupProps {
  onCleanup?: () => void
  intervals?: NodeJS.Timeout[]
  timeouts?: NodeJS.Timeout[]
  eventListeners?: Array<{
    element: EventTarget
    event: string
    handler: EventListener
  }>
}

export function useResourceCleanup({
  onCleanup,
  intervals = [],
  timeouts = [],
  eventListeners = [],
}: ResourceCleanupProps = {}) {
  const resourcesRef = useRef({
    intervals: new Set<NodeJS.Timeout>(),
    timeouts: new Set<NodeJS.Timeout>(),
    eventListeners: new Set<{
      element: EventTarget
      event: string
      handler: EventListener
    }>(),
  })

  const addInterval = (interval: NodeJS.Timeout) => {
    resourcesRef.current.intervals.add(interval)
    return interval
  }

  const addTimeout = (timeout: NodeJS.Timeout) => {
    resourcesRef.current.timeouts.add(timeout)
    return timeout
  }

  const addEventListener = (element: EventTarget, event: string, handler: EventListener) => {
    const listener = { element, event, handler }
    resourcesRef.current.eventListeners.add(listener)
    element.addEventListener(event, handler)
    return listener
  }

  const cleanup = () => {
    // Clear intervals
    resourcesRef.current.intervals.forEach(clearInterval)
    resourcesRef.current.intervals.clear()

    // Clear timeouts
    resourcesRef.current.timeouts.forEach(clearTimeout)
    resourcesRef.current.timeouts.clear()

    // Remove event listeners
    resourcesRef.current.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler)
    })
    resourcesRef.current.eventListeners.clear()

    // Custom cleanup
    onCleanup?.()
  }

  useEffect(() => {
    // Add initial resources
    intervals.forEach(addInterval)
    timeouts.forEach(addTimeout)
    eventListeners.forEach(({ element, event, handler }) => addEventListener(element, event, handler))

    return cleanup
  }, [])

  return {
    addInterval,
    addTimeout,
    addEventListener,
    cleanup,
  }
}
