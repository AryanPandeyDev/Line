/**
 * Unit tests for profileLogic.ts helper functions
 * 
 * Tests pure functions for profile operations:
 * - Username validation and generation
 * - Display name formatting
 * - Time formatting
 * - Date utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    generateRandomUsername,
    isValidUsername,
    isValidDisplayName,
    normalizeUsername,
    formatDisplayName,
    getAvatarUrl,
    formatPlayTime,
    secondsToHours,
    formatTokenBalance,
    calculateAccountAgeDays,
    formatDate,
    formatRelativeDate,
} from '@/src/lib/helpers/profileLogic'

describe('profileLogic', () => {
    describe('generateRandomUsername', () => {
        it('generates username with correct format', () => {
            const username = generateRandomUsername()
            expect(username).toMatch(/^user_\d{6}$/)
        })

        it('generates 6-digit suffix', () => {
            const username = generateRandomUsername()
            const digits = username.split('_')[1]
            expect(digits.length).toBe(6)
        })
    })

    describe('isValidUsername', () => {
        it('accepts valid usernames', () => {
            expect(isValidUsername('abc')).toBe(true)
            expect(isValidUsername('user123')).toBe(true)
            expect(isValidUsername('test_user')).toBe(true)
            expect(isValidUsername('UPPERCASE')).toBe(true)
        })

        it('rejects too short usernames', () => {
            expect(isValidUsername('ab')).toBe(false)
            expect(isValidUsername('')).toBe(false)
        })

        it('rejects too long usernames', () => {
            expect(isValidUsername('a'.repeat(21))).toBe(false)
        })

        it('rejects usernames starting with underscore', () => {
            expect(isValidUsername('_username')).toBe(false)
        })

        it('rejects usernames ending with underscore', () => {
            expect(isValidUsername('username_')).toBe(false)
        })

        it('rejects special characters', () => {
            expect(isValidUsername('user@name')).toBe(false)
            expect(isValidUsername('user name')).toBe(false)
            expect(isValidUsername('user-name')).toBe(false)
        })
    })

    describe('isValidDisplayName', () => {
        it('accepts valid display names', () => {
            expect(isValidDisplayName('')).toBe(true) // empty allowed
            expect(isValidDisplayName('John Doe')).toBe(true)
            expect(isValidDisplayName('a'.repeat(50))).toBe(true)
        })

        it('rejects too long display names', () => {
            expect(isValidDisplayName('a'.repeat(51))).toBe(false)
        })

        it('rejects leading/trailing whitespace', () => {
            expect(isValidDisplayName(' John')).toBe(false)
            expect(isValidDisplayName('John ')).toBe(false)
        })
    })

    describe('normalizeUsername', () => {
        it('converts to lowercase', () => {
            expect(normalizeUsername('UserName')).toBe('username')
            expect(normalizeUsername('ALLCAPS')).toBe('allcaps')
        })
    })

    describe('formatDisplayName', () => {
        it('returns displayName if present', () => {
            expect(formatDisplayName('Display', 'username')).toBe('Display')
        })

        it('falls back to firstName', () => {
            expect(formatDisplayName(null, 'username', 'First')).toBe('First')
        })

        it('falls back to username', () => {
            expect(formatDisplayName(null, 'username', null)).toBe('username')
        })
    })

    describe('getAvatarUrl', () => {
        it('returns avatarUrl if present', () => {
            expect(getAvatarUrl('/avatar.jpg', '/clerk.jpg')).toBe('/avatar.jpg')
        })

        it('falls back to clerkImageUrl', () => {
            expect(getAvatarUrl(null, '/clerk.jpg')).toBe('/clerk.jpg')
        })

        it('falls back to default', () => {
            expect(getAvatarUrl(null, null, '/default.jpg')).toBe('/default.jpg')
        })

        it('returns null if no fallback', () => {
            expect(getAvatarUrl(null, null)).toBe(null)
        })
    })

    describe('formatPlayTime', () => {
        it('formats hours and minutes', () => {
            expect(formatPlayTime(3661)).toBe('1h 1m') // 1 hour, 1 min
            expect(formatPlayTime(7200)).toBe('2h 0m') // 2 hours
        })

        it('formats minutes only when less than 1 hour', () => {
            expect(formatPlayTime(300)).toBe('5m')
            expect(formatPlayTime(0)).toBe('0m')
        })
    })

    describe('secondsToHours', () => {
        it('converts correctly', () => {
            expect(secondsToHours(3600)).toBe(1)
            expect(secondsToHours(7200)).toBe(2)
        })

        it('rounds to 1 decimal', () => {
            expect(secondsToHours(5400)).toBe(1.5) // 1.5 hours
        })
    })

    describe('formatTokenBalance', () => {
        it('adds commas for thousands', () => {
            expect(formatTokenBalance(1000)).toBe('1,000')
            expect(formatTokenBalance(1000000)).toBe('1,000,000')
        })
    })

    describe('calculateAccountAgeDays', () => {
        beforeEach(() => {
            vi.useFakeTimers()
            vi.setSystemTime(new Date('2024-06-15'))
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it('calculates age in days', () => {
            const createdAt = new Date('2024-06-10')
            expect(calculateAccountAgeDays(createdAt)).toBe(5)
        })

        it('returns 0 for same day', () => {
            const createdAt = new Date('2024-06-15')
            expect(calculateAccountAgeDays(createdAt)).toBe(0)
        })
    })

    describe('formatDate', () => {
        it('formats Date object', () => {
            const date = new Date('2024-06-15T12:00:00Z')
            expect(formatDate(date)).toBe('2024-06-15')
        })

        it('formats date string', () => {
            expect(formatDate('2024-06-15T12:00:00Z')).toBe('2024-06-15')
        })
    })

    describe('formatRelativeDate', () => {
        beforeEach(() => {
            vi.useFakeTimers()
            vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it('returns "just now" for very recent', () => {
            const date = new Date('2024-06-15T11:59:30Z')
            expect(formatRelativeDate(date)).toBe('just now')
        })

        it('returns minutes ago', () => {
            const date = new Date('2024-06-15T11:55:00Z')
            expect(formatRelativeDate(date)).toBe('5 minutes ago')
        })

        it('returns hours ago', () => {
            const date = new Date('2024-06-15T10:00:00Z')
            expect(formatRelativeDate(date)).toBe('2 hours ago')
        })

        it('returns days ago', () => {
            const date = new Date('2024-06-13T12:00:00Z')
            expect(formatRelativeDate(date)).toBe('2 days ago')
        })

        it('returns formatted date for old dates', () => {
            const date = new Date('2024-06-01T12:00:00Z')
            expect(formatRelativeDate(date)).toBe('2024-06-01')
        })
    })
})
