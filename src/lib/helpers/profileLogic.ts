/**
 * ============================================================================
 * PROFILE LOGIC HELPERS
 * ============================================================================
 * 
 * Pure functions for profile-related validations and formatting.
 * 
 * USERNAME RULES:
 * - 3-20 characters
 * - Alphanumeric and underscores only
 * - Case insensitive for uniqueness
 * 
 * ALLOWED:
 * - String validation and formatting
 * - Random generation for defaults
 * - Date calculations
 * 
 * FORBIDDEN:
 * - Database operations
 * - Async operations
 * - Side effects
 * 
 * ============================================================================
 */

/**
 * Generate a random username
 * Format: user_XXXXXX (6 random digits)
 */
export function generateRandomUsername(): string {
    const digits = Math.floor(100000 + Math.random() * 900000)
    return `user_${digits}`
}

/**
 * Validate username format
 * Rules:
 * - 3-20 characters
 * - Alphanumeric and underscores only
 * - Cannot start with underscore
 * - Cannot end with underscore
 */
export function isValidUsername(username: string): boolean {
    if (username.length < 3 || username.length > 20) return false
    if (username.startsWith('_') || username.endsWith('_')) return false
    return /^[a-zA-Z0-9_]+$/.test(username)
}

/**
 * Validate display name
 * Rules:
 * - 0-50 characters (empty allowed)
 * - No leading/trailing whitespace
 */
export function isValidDisplayName(displayName: string): boolean {
    const trimmed = displayName.trim()
    return trimmed === displayName && displayName.length <= 50
}

/**
 * Normalize username for comparison (lowercase)
 */
export function normalizeUsername(username: string): string {
    return username.toLowerCase()
}

/**
 * Format display name with fallbacks
 * Priority: displayName → firstName → username
 */
export function formatDisplayName(
    displayName: string | null,
    username: string,
    firstName?: string | null
): string {
    return displayName || firstName || username
}

/**
 * Get avatar URL with fallback
 */
export function getAvatarUrl(
    avatarUrl: string | null,
    clerkImageUrl?: string | null,
    defaultUrl?: string
): string | null {
    return avatarUrl || clerkImageUrl || defaultUrl || null
}

/**
 * Format play time for display
 * Converts seconds to "Xh Ym" or "Xm" format
 */
export function formatPlayTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)

    if (hours > 0) {
        return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
}

/**
 * Convert seconds to decimal hours
 */
export function secondsToHours(seconds: number): number {
    return Math.round((seconds / 3600) * 10) / 10
}

/**
 * Format token balance with commas
 */
export function formatTokenBalance(balance: number): string {
    return balance.toLocaleString()
}

/**
 * Calculate account age in days
 */
export function calculateAccountAgeDays(createdAt: Date): number {
    const now = new Date()
    const diffMs = now.getTime() - createdAt.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Format date for display (YYYY-MM-DD)
 */
export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toISOString().split('T')[0]
}

/**
 * Format date for relative display ("2 days ago", "just now")
 */
export function formatRelativeDate(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 7) return formatDate(date)
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
    return 'just now'
}
