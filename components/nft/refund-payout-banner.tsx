"use client"

import { AlertTriangle, Gift, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatLine } from "@/lib/contracts/decimals"

/**
 * =============================================================================
 * REFUND/PAYOUT BANNER COMPONENT
 * =============================================================================
 *
 * Alert banner shown when user has pending refund or payout to claim.
 * Appears at top of marketplace page.
 */

interface RefundPayoutBannerProps {
    pendingRefund: bigint
    pendingPayout: bigint
    onClaimRefund: () => void
    onClaimPayout: () => void
    isClaimingRefund?: boolean
    isClaimingPayout?: boolean
}

export function RefundPayoutBanner({
    pendingRefund,
    pendingPayout,
    onClaimRefund,
    onClaimPayout,
    isClaimingRefund = false,
    isClaimingPayout = false,
}: RefundPayoutBannerProps) {
    const hasRefund = pendingRefund > 0n
    const hasPayout = pendingPayout > 0n

    if (!hasRefund && !hasPayout) {
        return null
    }

    return (
        <div className="space-y-2 mb-6">
            {hasRefund && (
                <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-amber-400">Pending Refund Available</p>
                            <p className="text-sm text-amber-400/70">
                                You were outbid. Claim your{" "}
                                <span className="font-bold">{formatLine(pendingRefund)} LINE</span> refund.
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={onClaimRefund}
                        disabled={isClaimingRefund}
                        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    >
                        {isClaimingRefund ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Claiming...
                            </>
                        ) : (
                            "Claim Refund"
                        )}
                    </Button>
                </div>
            )}

            {hasPayout && (
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <Gift className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-green-400">Pending Payout Available</p>
                            <p className="text-sm text-green-400/70">
                                Your auction completed! Claim your{" "}
                                <span className="font-bold">{formatLine(pendingPayout)} LINE</span> payout.
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={onClaimPayout}
                        disabled={isClaimingPayout}
                        className="bg-green-500 hover:bg-green-600 text-black font-semibold"
                    >
                        {isClaimingPayout ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Claiming...
                            </>
                        ) : (
                            "Claim Payout"
                        )}
                    </Button>
                </div>
            )}
        </div>
    )
}
