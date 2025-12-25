/**
 * =============================================================================
 * LINE TOKEN DECIMAL HELPERS
 * =============================================================================
 *
 * CRITICAL: LINE token uses 9 decimals.
 * These helpers convert between user-facing decimal strings and BigInt base units.
 *
 * RULES:
 * - Always store amounts as BigInt (or string of base units) in Redux
 * - Never use floating point for token amounts
 * - Use parseLine() for user input → chain
 * - Use formatLine() for chain → display
 */

/** LINE token decimal places as bigint for calculations */
export const LINE_DECIMALS = 9n

/** Base unit multiplier (10^9) */
const BASE = 10n ** LINE_DECIMALS

/**
 * Parse user input string to BigInt base units
 *
 * @param amountStr - Decimal string like "30.5" or "100"
 * @returns BigInt in base units (e.g., "30.5" → 30500000000n)
 *
 * @example
 * parseLine("30.5")  // → 30500000000n
 * parseLine("100")   // → 100000000000n
 * parseLine("0.001") // → 1000000n
 */
export function parseLine(amountStr: string): bigint {
    if (!amountStr || amountStr.trim() === '') {
        return 0n
    }

    // Remove commas and whitespace
    const cleaned = amountStr.replace(/,/g, '').trim()

    // Validate format
    if (!/^-?\d*\.?\d*$/.test(cleaned) || cleaned === '.' || cleaned === '') {
        throw new Error(`Invalid LINE amount: "${amountStr}"`)
    }

    const [intPart, fracPart = ''] = cleaned.split('.')

    // Pad or truncate fraction to exactly 9 digits
    const paddedFrac = (fracPart + '0'.repeat(Number(LINE_DECIMALS)))
        .slice(0, Number(LINE_DECIMALS))

    const intValue = BigInt(intPart || '0') * BASE
    const fracValue = BigInt(paddedFrac)

    return intValue + fracValue
}

/**
 * Format BigInt base units to display string
 *
 * @param amountBase - BigInt in base units
 * @returns Decimal string for display (e.g., 30500000000n → "30.5")
 *
 * @example
 * formatLine(30500000000n)  // → "30.5"
 * formatLine(100000000000n) // → "100"
 * formatLine(1000000n)      // → "0.001"
 */
export function formatLine(amountBase: bigint): string {
    if (amountBase === 0n) {
        return '0'
    }

    const isNegative = amountBase < 0n
    const absAmount = isNegative ? -amountBase : amountBase

    const intPart = absAmount / BASE
    const fracPart = absAmount % BASE

    // Format fractional part: pad to 9 digits, then remove trailing zeros
    const fracStr = fracPart
        .toString()
        .padStart(Number(LINE_DECIMALS), '0')
        .replace(/0+$/, '')

    const sign = isNegative ? '-' : ''

    return fracStr ? `${sign}${intPart}.${fracStr}` : `${sign}${intPart}`
}

/**
 * Format BigInt base units with fixed decimal places for display
 *
 * @param amountBase - BigInt in base units
 * @param decimals - Number of decimal places to show (default: 2)
 * @returns Formatted string with specified decimals
 *
 * @example
 * formatLineFixed(30555555555n, 2) // → "30.55"
 * formatLineFixed(30555555555n, 4) // → "30.5555"
 */
export function formatLineFixed(amountBase: bigint, decimals = 2): string {
    const full = formatLine(amountBase)
    const [intPart, fracPart = ''] = full.split('.')

    if (decimals === 0) {
        return intPart
    }

    const paddedFrac = (fracPart + '0'.repeat(decimals)).slice(0, decimals)
    return `${intPart}.${paddedFrac}`
}

/**
 * Parse a BigInt string (from Redux) back to BigInt
 * Used when retrieving serialized BigInt from Redux state
 */
export function parseLineRaw(rawStr: string): bigint {
    try {
        return BigInt(rawStr)
    } catch {
        return 0n
    }
}

/**
 * Check if a BigInt amount is zero
 */
export function isZeroLine(amount: bigint): boolean {
    return amount === 0n
}

/**
 * Compare two LINE amounts
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareLine(a: bigint, b: bigint): -1 | 0 | 1 {
    if (a < b) return -1
    if (a > b) return 1
    return 0
}

/**
 * Add two LINE amounts safely
 */
export function addLine(a: bigint, b: bigint): bigint {
    return a + b
}

/**
 * Subtract LINE amounts safely
 */
export function subtractLine(a: bigint, b: bigint): bigint {
    return a - b
}
