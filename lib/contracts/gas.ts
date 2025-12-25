/**
 * =============================================================================
 * GAS ESTIMATION UTILITIES
 * =============================================================================
 *
 * Helpers for estimating and displaying gas costs before transactions.
 * Adds a 20% buffer to ensure transactions succeed.
 */

import { VARA_RPC } from './config'

/** Gas limit multiplier (20% buffer) */
const GAS_BUFFER = 1.2

/**
 * Estimate gas for a Sails transaction
 *
 * @param sails - Initialized Sails instance
 * @param serviceName - Service name (e.g., 'Marketplace')
 * @param functionName - Function name (e.g., 'Bid')
 * @param args - Function arguments
 * @returns Estimated gas with buffer
 */
export async function estimateGas(
    sails: { services: Record<string, { functions: Record<string, (...args: unknown[]) => unknown> }> },
    serviceName: string,
    functionName: string,
    args: unknown[]
): Promise<{
    estimated: bigint
    withBuffer: bigint
    displayVara: string
}> {
    try {
        const func = sails.services[serviceName]?.functions[functionName]
        if (!func) {
            throw new Error(`Function ${serviceName}.${functionName} not found`)
        }

        // Call the function to get the transaction builder
        const tx = func(...args)

        // Get gas estimate from the transaction
        // sails-js provides gas estimation via calculateGas
        const gasInfo = await (tx as { calculateGas(): Promise<{ limit: bigint }> }).calculateGas()
        const estimated = gasInfo.limit

        // Add 20% buffer
        const withBuffer = BigInt(Math.ceil(Number(estimated) * GAS_BUFFER))

        // Convert to VARA for display (12 decimals)
        const varaAmount = Number(withBuffer) / 1e12
        const displayVara = varaAmount < 0.001
            ? '< 0.001 VARA'
            : `~${varaAmount.toFixed(3)} VARA`

        return {
            estimated,
            withBuffer,
            displayVara,
        }
    } catch (error) {
        console.error('Gas estimation failed:', error)
        // Return default high estimate if calculation fails
        const defaultGas = 50_000_000_000n // 50 billion gas units
        return {
            estimated: defaultGas,
            withBuffer: defaultGas,
            displayVara: '~0.05 VARA (estimated)',
        }
    }
}

/**
 * Format gas amount for display
 */
export function formatGas(gasUnits: bigint): string {
    const billions = Number(gasUnits) / 1e9
    return `${billions.toFixed(2)}B`
}

/**
 * Format VARA amount for display
 */
export function formatVara(planck: bigint): string {
    const vara = Number(planck) / 1e12
    if (vara < 0.001) return '< 0.001'
    if (vara < 1) return vara.toFixed(3)
    return vara.toFixed(2)
}
