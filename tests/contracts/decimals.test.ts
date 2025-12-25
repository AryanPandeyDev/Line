/**
 * =============================================================================
 * DECIMAL HELPERS UNIT TESTS
 * =============================================================================
 */

import { describe, it, expect } from 'vitest'
import {
    parseLine,
    formatLine,
    formatLineFixed,
    parseLineRaw,
    isZeroLine,
    compareLine,
    addLine,
    subtractLine,
    LINE_DECIMALS,
} from '@/lib/contracts/decimals'

describe('parseLine', () => {
    it('parses whole numbers', () => {
        expect(parseLine('100')).toBe(100_000_000_000n)
        expect(parseLine('1')).toBe(1_000_000_000n)
        expect(parseLine('0')).toBe(0n)
    })

    it('parses decimal numbers', () => {
        expect(parseLine('30.5')).toBe(30_500_000_000n)
        expect(parseLine('0.001')).toBe(1_000_000n)
        expect(parseLine('0.000000001')).toBe(1n)
    })

    it('handles trailing zeros', () => {
        expect(parseLine('100.000')).toBe(100_000_000_000n)
        expect(parseLine('1.10')).toBe(1_100_000_000n)
    })

    it('handles empty and whitespace', () => {
        expect(parseLine('')).toBe(0n)
        expect(parseLine('  ')).toBe(0n)
    })

    it('handles commas in numbers', () => {
        expect(parseLine('1,000')).toBe(1_000_000_000_000n)
        expect(parseLine('1,234.56')).toBe(1_234_560_000_000n)
    })

    it('throws on invalid input', () => {
        expect(() => parseLine('abc')).toThrow()
        expect(() => parseLine('12.34.56')).toThrow()
    })
})

describe('formatLine', () => {
    it('formats whole numbers', () => {
        expect(formatLine(100_000_000_000n)).toBe('100')
        expect(formatLine(1_000_000_000n)).toBe('1')
        expect(formatLine(0n)).toBe('0')
    })

    it('formats decimals without trailing zeros', () => {
        expect(formatLine(30_500_000_000n)).toBe('30.5')
        expect(formatLine(1_000_000n)).toBe('0.001')
        expect(formatLine(123_456_789_123n)).toBe('123.456789123')
    })

    it('handles minimum units', () => {
        expect(formatLine(1n)).toBe('0.000000001')
    })
})

describe('formatLineFixed', () => {
    it('formats with fixed decimals', () => {
        expect(formatLineFixed(30_555_555_555n, 2)).toBe('30.55')
        expect(formatLineFixed(30_555_555_555n, 4)).toBe('30.5555')
        expect(formatLineFixed(100_000_000_000n, 2)).toBe('100.00')
    })

    it('handles zero decimals', () => {
        expect(formatLineFixed(30_555_555_555n, 0)).toBe('30')
    })
})

describe('parseLineRaw', () => {
    it('parses BigInt strings', () => {
        expect(parseLineRaw('100000000000')).toBe(100_000_000_000n)
        expect(parseLineRaw('0')).toBe(0n)
    })

    it('returns 0 on invalid input', () => {
        expect(parseLineRaw('invalid')).toBe(0n)
        expect(parseLineRaw('')).toBe(0n)
    })
})

describe('utility functions', () => {
    it('isZeroLine', () => {
        expect(isZeroLine(0n)).toBe(true)
        expect(isZeroLine(1n)).toBe(false)
    })

    it('compareLine', () => {
        expect(compareLine(100n, 200n)).toBe(-1)
        expect(compareLine(200n, 100n)).toBe(1)
        expect(compareLine(100n, 100n)).toBe(0)
    })

    it('addLine', () => {
        expect(addLine(100n, 50n)).toBe(150n)
    })

    it('subtractLine', () => {
        expect(subtractLine(100n, 50n)).toBe(50n)
    })
})

describe('roundtrip', () => {
    it('parses and formats back to original', () => {
        const testCases = ['100', '0.5', '123.456', '0.000000001']
        for (const input of testCases) {
            const parsed = parseLine(input)
            const formatted = formatLine(parsed)
            expect(formatted).toBe(input)
        }
    })
})
