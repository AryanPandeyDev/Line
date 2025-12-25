'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * =============================================================================
 * POLLING HOOK
 * =============================================================================
 *
 * Periodically fetches data at specified intervals.
 * Automatically cleans up on unmount or when disabled.
 *
 * @param fn - Async function to call periodically
 * @param intervalMs - Polling interval in milliseconds
 * @param active - Whether polling is active (default: true)
 */
export function usePolling<T>(
    fn: () => Promise<T>,
    intervalMs: number,
    active = true
): {
    data: T | null
    error: Error | null
    isLoading: boolean
    refresh: () => void
} {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<Error | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const mountedRef = useRef(true)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    const clearTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }, [])

    const fetchData = useCallback(async () => {
        if (!mountedRef.current) return

        setIsLoading(true)
        setError(null)

        try {
            const result = await fn()
            if (mountedRef.current) {
                setData(result)
            }
        } catch (err) {
            if (mountedRef.current) {
                setError(err instanceof Error ? err : new Error(String(err)))
            }
        } finally {
            if (mountedRef.current) {
                setIsLoading(false)
                // Schedule next poll
                if (active) {
                    timeoutRef.current = setTimeout(fetchData, intervalMs)
                }
            }
        }
    }, [fn, intervalMs, active])

    // Manual refresh function
    const refresh = useCallback(() => {
        clearTimer()
        fetchData()
    }, [clearTimer, fetchData])

    useEffect(() => {
        mountedRef.current = true

        if (active) {
            fetchData()
        }

        return () => {
            mountedRef.current = false
            clearTimer()
        }
    }, [active, fetchData, clearTimer])

    return { data, error, isLoading, refresh }
}

/**
 * Simplified polling hook that just returns data
 * Use when you don't need loading/error states
 */
export function usePollingSimple<T>(
    fn: () => Promise<T>,
    intervalMs: number,
    active = true
): T | null {
    const { data } = usePolling(fn, intervalMs, active)
    return data
}
