'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Sails } from 'sails-js'
import { SailsIdlParser } from 'sails-js-parser'
import { VARA_RPC, CONTRACTS } from '@/lib/contracts/config'

/**
 * =============================================================================
 * SAILS CLIENT HOOK
 * =============================================================================
 *
 * Provides lazy-initialized Sails client for blockchain interactions.
 * Handles connection, reconnection, and cleanup.
 *
 * USAGE:
 * const { sails, isReady, error, reconnect } = useSails('marketplace')
 *
 * IMPORTANT: This hook initializes sails-js for frontend use.
 * The client MUST have a signer set before sending transactions.
 */

export type ContractType = 'marketplace' | 'nft' | 'line_token'

interface SailsState {
    sails: Sails | null
    isReady: boolean
    isConnecting: boolean
    error: string | null
}

const IDL_PATHS: Record<ContractType, string> = {
    marketplace: '/contracts/marketplace.idl',
    nft: '/contracts/nft.idl',
    line_token: '/contracts/line_token.idl',
}

const PROGRAM_IDS: Record<ContractType, string> = {
    marketplace: CONTRACTS.MARKETPLACE,
    nft: CONTRACTS.NFT,
    line_token: CONTRACTS.LINE_TOKEN,
}

/**
 * Hook to get an initialized Sails client for a specific contract
 */
export function useSails(contractType: ContractType): SailsState & {
    reconnect: () => Promise<void>
    disconnect: () => void
} {
    const [state, setState] = useState<SailsState>({
        sails: null,
        isReady: false,
        isConnecting: false,
        error: null,
    })

    const sailsRef = useRef<Sails | null>(null)
    const apiRef = useRef<unknown>(null)
    const mountedRef = useRef(true)

    const disconnect = useCallback(() => {
        if (apiRef.current && typeof (apiRef.current as { disconnect?: () => void }).disconnect === 'function') {
            (apiRef.current as { disconnect: () => void }).disconnect()
        }
        sailsRef.current = null
        apiRef.current = null
        if (mountedRef.current) {
            setState({
                sails: null,
                isReady: false,
                isConnecting: false,
                error: null,
            })
        }
    }, [])

    const connect = useCallback(async () => {
        if (!mountedRef.current) return

        const programId = PROGRAM_IDS[contractType]
        if (!programId) {
            setState(prev => ({
                ...prev,
                error: `Missing program ID for ${contractType}. Check environment variables.`,
                isConnecting: false,
            }))
            return
        }

        setState(prev => ({ ...prev, isConnecting: true, error: null }))

        try {
            // Dynamic import to avoid SSR issues
            const { GearApi } = await import('@gear-js/api')

            // Fetch IDL
            const idlPath = IDL_PATHS[contractType]
            const idlResponse = await fetch(idlPath)
            if (!idlResponse.ok) {
                throw new Error(`Failed to fetch IDL from ${idlPath}`)
            }
            const idl = await idlResponse.text()

            // Connect to Vara network
            const api = await GearApi.create({ providerAddress: VARA_RPC })
            apiRef.current = api

            // Initialize Sails
            const parser = new SailsIdlParser()
            await parser.init()
            const sails = new Sails(parser)
            sails.parseIdl(idl)
            sails.setApi(api)
            sails.setProgramId(programId as `0x${string}`)

            sailsRef.current = sails

            if (mountedRef.current) {
                setState({
                    sails,
                    isReady: true,
                    isConnecting: false,
                    error: null,
                })
            }
        } catch (err) {
            console.error(`Sails connection error (${contractType}):`, err)
            if (mountedRef.current) {
                setState({
                    sails: null,
                    isReady: false,
                    isConnecting: false,
                    error: err instanceof Error ? err.message : 'Failed to connect',
                })
            }
        }
    }, [contractType])

    const reconnect = useCallback(async () => {
        disconnect()
        await connect()
    }, [disconnect, connect])

    useEffect(() => {
        mountedRef.current = true
        connect()

        return () => {
            mountedRef.current = false
            disconnect()
        }
    }, [connect, disconnect])

    return {
        ...state,
        reconnect,
        disconnect,
    }
}

/**
 * Hook to get Marketplace contract client
 */
export function useMarketplaceSails() {
    return useSails('marketplace')
}

/**
 * Hook to get NFT contract client
 */
export function useNftSails() {
    return useSails('nft')
}

/**
 * Hook to get LINE Token contract client
 */
export function useLineSails() {
    return useSails('line_token')
}
