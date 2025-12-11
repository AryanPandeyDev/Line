/**
 * ============================================================================
 * WALLET SERVICE
 * ============================================================================
 * 
 * Business logic for wallet operations.
 * 
 * DOMAIN SCOPE:
 * - Wallet connection/disconnection
 * - Balance retrieval
 * - Transaction history
 * 
 * ALLOWED:
 * - Call walletRepo
 * - Use db-helpers for getOrCreateWallet
 * 
 * FORBIDDEN:
 * - Direct Prisma usage
 * - Blockchain RPC calls (not yet implemented)
 * 
 * ============================================================================
 */

import { walletRepo } from '@/src/lib/repositories/walletRepo'
import { getUserByClerkId, getOrCreateWallet } from '@/lib/db-helpers'

export interface WalletInfoResponse {
    isConnected: boolean
    address: string | null
    shortAddress?: string
    network: string
    varaBalance: number
    lineBalance: number
    nftCount: number
    transactions: Array<{
        id: string
        type: string
        amount: number
        token: string
        from: string | null
        to: string | null
        timestamp: string
        status: string
        nftName: string | null
    }>
}

export interface WalletActionResult {
    success: boolean
    message: string
    wallet?: {
        address: string
        shortAddress: string
        network: string
        varaBalance: number
        lineBalance: number
    }
    varaBalance?: number
    lineBalance?: number
}

export const walletService = {
    /**
     * Get wallet info for the current user
     */
    getWalletInfo: async (clerkId: string): Promise<WalletInfoResponse | null> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return null

        const data = await walletRepo.findByUserIdWithTransactions(user.id)

        if (!data) {
            return {
                isConnected: false,
                address: null,
                network: 'unknown',
                varaBalance: 0,
                lineBalance: 0,
                nftCount: 0,
                transactions: [],
            }
        }

        const { wallet, transactions, nftCount } = data

        return {
            isConnected: wallet.isConnected,
            address: wallet.address,
            shortAddress: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
            network: wallet.network.toLowerCase().replace('_', '-'),
            varaBalance: wallet.varaBalance,
            lineBalance: wallet.lineBalance,
            nftCount,
            transactions: transactions.map((tx) => ({
                id: tx.id,
                type: tx.type.toLowerCase().replace('_', '-'),
                amount: tx.amount,
                token: tx.tokenType,
                from: tx.fromAddress,
                to: tx.toAddress,
                timestamp: tx.createdAt.toISOString(),
                status: tx.status.toLowerCase(),
                nftName: tx.nftName,
            })),
        }
    },

    /**
     * Connect a wallet
     */
    connectWallet: async (clerkId: string, address: string, network?: string): Promise<WalletActionResult> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return { success: false, message: 'User not found' }

        const wallet = await getOrCreateWallet(user.id, address)

        if (network) {
            await walletRepo.update(wallet.id, {
                network: network.toUpperCase().replace('-', '_'),
            })
        }

        return {
            success: true,
            message: 'Wallet connected successfully!',
            wallet: {
                address: wallet.address,
                shortAddress: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
                network: wallet.network.toLowerCase().replace('_', '-'),
                varaBalance: wallet.varaBalance,
                lineBalance: wallet.lineBalance,
            },
        }
    },

    /**
     * Disconnect wallet
     */
    disconnectWallet: async (clerkId: string): Promise<WalletActionResult> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return { success: false, message: 'User not found' }

        await walletRepo.updateByUserId(user.id, { isConnected: false })

        return { success: true, message: 'Wallet disconnected' }
    },

    /**
     * Sync wallet balances
     */
    syncWallet: async (clerkId: string): Promise<WalletActionResult> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return { success: false, message: 'User not found' }

        const wallet = await walletRepo.findByUserId(user.id)
        if (!wallet) {
            return { success: false, message: 'No wallet connected' }
        }

        // TODO: Implement real blockchain balance sync
        await walletRepo.update(wallet.id, { lastSyncedAt: new Date() })

        return {
            success: true,
            message: 'Wallet synced',
            varaBalance: wallet.varaBalance,
            lineBalance: wallet.lineBalance,
        }
    },

    /**
     * Get on-chain LINE token balance for a wallet address
     * @param address - Wallet address in any format (hex, SS58)
     * @returns Balance info with raw and human-readable values
     */
    getOnchainLineBalance: async (address: string): Promise<{ raw: string; human: number } | null> => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/wallet/onchain-balance?address=${encodeURIComponent(address)}`
            )
            if (!response.ok) {
                console.error('Failed to fetch on-chain balance:', await response.text())
                return null
            }
            return await response.json()
        } catch (error) {
            console.error('Error fetching on-chain balance:', error)
            return null
        }
    },
}
