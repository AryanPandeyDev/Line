"use client"

import { useState } from "react"
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatLine } from "@/lib/contracts/decimals"

/**
 * =============================================================================
 * APPROVAL MODAL COMPONENT
 * =============================================================================
 *
 * Modal for LINE token approval before bidding.
 *
 * FLOW:
 * 1. Check current allowance
 * 2. If insufficient, show approval modal
 * 3. User approves via SubWallet
 * 4. On success, proceed to bid
 */

export type ApprovalStatus = "idle" | "approving" | "approved" | "error"

interface ApprovalModalProps {
    isOpen: boolean
    onClose: () => void
    onApprove: () => Promise<void>
    onApproveSuccess: () => void
    requiredAmount: bigint
    currentAllowance: bigint
    status: ApprovalStatus
    error?: string
}

export function ApprovalModal({
    isOpen,
    onClose,
    onApprove,
    onApproveSuccess,
    requiredAmount,
    currentAllowance,
    status,
    error,
}: ApprovalModalProps) {
    const [isProcessing, setIsProcessing] = useState(false)

    const handleApprove = async () => {
        setIsProcessing(true)
        try {
            await onApprove()
            onApproveSuccess()
        } catch (e) {
            console.error("Approval error:", e)
        } finally {
            setIsProcessing(false)
        }
    }

    const shortfall = requiredAmount - currentAllowance
    const displayRequired = formatLine(requiredAmount)
    const displayCurrent = formatLine(currentAllowance)
    const displayShortfall = formatLine(shortfall > 0n ? shortfall : 0n)

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {status === "error" ? (
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        ) : status === "approved" ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                            <span className="w-5 h-5 text-xl">💰</span>
                        )}
                        {status === "approved" ? "Approval Successful" : "Approve LINE Spending"}
                    </DialogTitle>
                    <DialogDescription>
                        {status === "approved"
                            ? "You can now proceed with your bid."
                            : "To place a bid, you need to approve the marketplace to transfer LINE tokens on your behalf."}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {status === "error" && error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    {status !== "approved" && status !== "error" && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                                <span className="text-sm text-muted-foreground">Bid Amount</span>
                                <span className="font-bold text-primary">{displayRequired} LINE</span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                                <span className="text-sm text-muted-foreground">Current Allowance</span>
                                <span className="font-medium">{displayCurrent} LINE</span>
                            </div>

                            {shortfall > 0n && (
                                <div className="flex justify-between items-center p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                    <span className="text-sm text-amber-500">Additional Approval Needed</span>
                                    <span className="font-bold text-amber-500">{displayShortfall} LINE</span>
                                </div>
                            )}

                            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <p className="text-sm text-blue-400">
                                    <strong>Why is this needed?</strong>
                                    <br />
                                    The marketplace needs permission to transfer LINE tokens from your wallet when you win an auction.
                                    This is a standard blockchain security practice.
                                </p>
                            </div>
                        </div>
                    )}

                    {status === "approved" && (
                        <div className="text-center py-4">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <p className="text-green-400 font-medium">
                                Marketplace approved for {displayRequired} LINE
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {status === "approved" ? (
                        <Button
                            onClick={onClose}
                            className="w-full bg-gradient-to-r from-primary to-secondary"
                        >
                            Continue to Bid
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleApprove}
                                disabled={isProcessing || status === "approving"}
                                className="bg-gradient-to-r from-primary to-secondary"
                            >
                                {isProcessing || status === "approving" ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Approving...
                                    </>
                                ) : (
                                    "Approve LINE"
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
