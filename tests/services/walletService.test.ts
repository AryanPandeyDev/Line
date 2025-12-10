/**
 * WALLET SERVICE UNIT TESTS
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
    walletRepo: {
        findByUserIdWithTransactions: vi.fn(),
        findByUserId: vi.fn(),
        update: vi.fn(),
        updateByUserId: vi.fn(),
    },
    getUserByClerkId: vi.fn(),
    getOrCreateWallet: vi.fn(),
}))

vi.mock('@/src/lib/repositories/walletRepo', () => ({ walletRepo: mocks.walletRepo }))
vi.mock('@/lib/db-helpers', () => ({
    getUserByClerkId: mocks.getUserByClerkId,
    getOrCreateWallet: mocks.getOrCreateWallet,
}))

import { walletService } from '@/src/lib/services/walletService'

function createMockUser() { return { id: 'user-123', tokenBalance: 1000 } }
function createMockWallet(o = {}) {
    return { id: 'wallet-1', userId: 'user-123', address: '0x1234567890abcdef1234567890abcdef12345678', isConnected: true, network: 'VARA_MAINNET', varaBalance: 100, lineBalance: 500, ...o }
}
function createMockTx(o = {}) {
    return { id: 'tx-1', type: 'TOKEN_TRANSFER', amount: 100, tokenType: 'LINE', fromAddress: '0x123', toAddress: '0x456', createdAt: new Date('2024-06-15'), status: 'CONFIRMED', nftName: null, ...o }
}

describe('walletService', () => {
    beforeEach(() => vi.clearAllMocks())

    describe('getWalletInfo', () => {
        it('returns null when user not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(null)
            expect(await walletService.getWalletInfo('clerk-123')).toBeNull()
        })

        it('returns disconnected state when no wallet', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.walletRepo.findByUserIdWithTransactions.mockResolvedValue(null)
            const result = await walletService.getWalletInfo('clerk-123')
            expect(result).toMatchObject({ isConnected: false, address: null, nftCount: 0 })
        })

        it('returns wallet info with transactions', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.walletRepo.findByUserIdWithTransactions.mockResolvedValue({
                wallet: createMockWallet(),
                transactions: [createMockTx()],
                nftCount: 5,
            })
            const result = await walletService.getWalletInfo('clerk-123')
            expect(result).toMatchObject({
                isConnected: true,
                address: '0x1234567890abcdef1234567890abcdef12345678',
                shortAddress: '0x1234...5678',
                network: 'vara-mainnet',
                varaBalance: 100,
                lineBalance: 500,
                nftCount: 5,
            })
            expect(result?.transactions).toHaveLength(1)
        })

        it('formats transaction correctly', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.walletRepo.findByUserIdWithTransactions.mockResolvedValue({
                wallet: createMockWallet(),
                transactions: [createMockTx({ type: 'NFT_PURCHASE', status: 'PENDING' })],
                nftCount: 0,
            })
            const result = await walletService.getWalletInfo('clerk-123')
            expect(result?.transactions[0]).toMatchObject({ type: 'nft-purchase', status: 'pending' })
        })
    })

    describe('connectWallet', () => {
        it('returns failure when user not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(null)
            expect(await walletService.connectWallet('clerk-123', '0x123')).toEqual({ success: false, message: 'User not found' })
        })

        it('connects wallet successfully', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.getOrCreateWallet.mockResolvedValue(createMockWallet())
            const result = await walletService.connectWallet('clerk-123', '0x123')
            expect(result).toMatchObject({
                success: true,
                message: 'Wallet connected successfully!',
                wallet: expect.objectContaining({ address: expect.any(String) }),
            })
        })

        it('updates network if provided', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.getOrCreateWallet.mockResolvedValue(createMockWallet())
            await walletService.connectWallet('clerk-123', '0x123', 'vara-testnet')
            expect(mocks.walletRepo.update).toHaveBeenCalledWith('wallet-1', { network: 'VARA_TESTNET' })
        })
    })

    describe('disconnectWallet', () => {
        it('returns failure when user not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(null)
            expect(await walletService.disconnectWallet('clerk-123')).toEqual({ success: false, message: 'User not found' })
        })

        it('disconnects wallet successfully', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.walletRepo.updateByUserId.mockResolvedValue(undefined)
            const result = await walletService.disconnectWallet('clerk-123')
            expect(mocks.walletRepo.updateByUserId).toHaveBeenCalledWith('user-123', { isConnected: false })
            expect(result).toEqual({ success: true, message: 'Wallet disconnected' })
        })
    })

    describe('syncWallet', () => {
        it('returns failure when user not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(null)
            expect(await walletService.syncWallet('clerk-123')).toEqual({ success: false, message: 'User not found' })
        })

        it('returns failure when no wallet', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.walletRepo.findByUserId.mockResolvedValue(null)
            expect(await walletService.syncWallet('clerk-123')).toEqual({ success: false, message: 'No wallet connected' })
        })

        it('syncs wallet successfully', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.walletRepo.findByUserId.mockResolvedValue(createMockWallet())
            mocks.walletRepo.update.mockResolvedValue(undefined)
            const result = await walletService.syncWallet('clerk-123')
            expect(result).toMatchObject({ success: true, varaBalance: 100, lineBalance: 500 })
        })
    })
})
