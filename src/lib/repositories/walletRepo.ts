/**
 * ============================================================================
 * WALLET REPOSITORY
 * ============================================================================
 * 
 * Data access layer for Prisma Wallet and WalletTransaction models.
 * 
 * PRISMA MODELS ACCESSED:
 * - Wallet (primary)
 * - WalletTransaction (transaction history)
 * - UserNFT (for NFT count)
 * 
 * FORBIDDEN:
 * - Blockchain RPC calls
 * - Signature verification
 * 
 * ============================================================================
 */

import { db } from '@/lib/db'
import type { Wallet } from '@/lib/generated/prisma'

export interface WalletWithTransactions {
    wallet: Wallet
    transactions: Array<{
        id: string
        type: string
        amount: number
        tokenType: string
        fromAddress: string | null
        toAddress: string | null
        createdAt: Date
        status: string
        nftName: string | null
    }>
    nftCount: number
}

export const walletRepo = {
    /**
     * Find wallet by user ID
     */
    findByUserId: async (userId: string): Promise<Wallet | null> => {
        return db.wallet.findUnique({
            where: { userId },
        })
    },

    /**
     * Find wallet with transactions and NFT count
     */
    findByUserIdWithTransactions: async (userId: string): Promise<WalletWithTransactions | null> => {
        const wallet = await db.wallet.findUnique({
            where: { userId },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: {
                        nft: {
                            select: { name: true },
                        },
                    },
                },
            },
        })

        if (!wallet) {
            return null
        }

        const nftCount = await db.userNFT.count({
            where: { userId },
        })

        return {
            wallet,
            transactions: wallet.transactions.map((tx) => ({
                id: tx.id,
                type: tx.type,
                amount: tx.amount,
                tokenType: tx.tokenType,
                fromAddress: tx.fromAddress,
                toAddress: tx.toAddress,
                createdAt: tx.createdAt,
                status: tx.status,
                nftName: tx.nft?.name || null,
            })),
            nftCount,
        }
    },

    /**
     * Create wallet
     */
    create: async (userId: string, address: string, network: string = 'VARA_TESTNET'): Promise<Wallet> => {
        return db.wallet.create({
            data: {
                userId,
                address,
                network: network as 'VARA_MAINNET' | 'VARA_TESTNET',
                isConnected: true,
                varaBalance: 0,
                lineBalance: 0,
                connectedAt: new Date(),
            },
        })
    },

    /**
     * Update wallet
     */
    update: async (id: string, data: {
        address?: string
        network?: string
        isConnected?: boolean
        varaBalance?: number
        lineBalance?: number
        connectedAt?: Date
        lastSyncedAt?: Date
    }): Promise<Wallet> => {
        return db.wallet.update({
            where: { id },
            data: data as any,
        })
    },

    /**
     * Update wallet by user ID
     */
    updateByUserId: async (userId: string, data: {
        isConnected?: boolean
        lastSyncedAt?: Date
    }): Promise<Wallet | null> => {
        const wallet = await db.wallet.findUnique({ where: { userId } })
        if (!wallet) return null

        return db.wallet.update({
            where: { id: wallet.id },
            data,
        })
    },
}
