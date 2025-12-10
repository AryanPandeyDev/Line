/**
 * Example utility test file
 * 
 * This is a placeholder to verify the testing infrastructure is working.
 * Utility tests are similar to helper tests: testing pure utility functions.
 */

import { describe, it, expect } from 'vitest'

// Example utility functions (placeholders)
function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function slugify(text: string): string {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

describe('Example Utility Test', () => {
    it('should verify testing infrastructure is working', () => {
        expect(true).toBe(true)
    })

    it('placeholder: email validation utility', () => {
        expect(isValidEmail('test@example.com')).toBe(true)
        expect(isValidEmail('invalid')).toBe(false)
        expect(isValidEmail('test@')).toBe(false)
    })

    it('placeholder: slugify utility', () => {
        expect(slugify('Hello World')).toBe('hello-world')
        expect(slugify('Test 123')).toBe('test-123')
        expect(slugify('Special @#$ Characters')).toBe('special--characters')
    })
})
