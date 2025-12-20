"use client"

import { useState } from "react"
import { X, ArrowUpRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { selectActiveModal, closeModal } from "@/lib/redux/slices/ui-slice"
import { selectWallet, fetchWalletState } from "@/lib/redux/slices/wallet-slice"
import { selectUser } from "@/lib/redux/slices/auth-slice"

type WithdrawStep = "input" | "authorizing" | "submitting" | "confirming" | "success" | "error"

interface WithdrawalAuth {
    amount: string
    amountHuman: number
    withdrawalId: string
    expiry: number
    signature: string
    contractAddress: string
}

export function WithdrawalModal() {
    const dispatch = useAppDispatch()
    const activeModal = useAppSelector(selectActiveModal)
    const wallet = useAppSelector(selectWallet)
    const user = useAppSelector(selectUser)

    const [amount, setAmount] = useState("")
    const [step, setStep] = useState<WithdrawStep>("input")
    const [error, setError] = useState<string | null>(null)
    const [txHash, setTxHash] = useState<string | null>(null)
    const [authorization, setAuthorization] = useState<WithdrawalAuth | null>(null)

    // User's off-chain (DB) balance
    const dbBalance = user?.tokens || 0

    if (activeModal !== "withdrawal") return null

    const handleClose = () => {
        setStep("input")
        setAmount("")
        setError(null)
        setTxHash(null)
        setAuthorization(null)
        dispatch(closeModal())
    }

    const handleMaxClick = () => {
        setAmount(dbBalance.toString())
    }

    const handleWithdraw = async () => {
        const amountNum = parseFloat(amount)

        // Validate
        if (!amount || amountNum <= 0) {
            setError("Please enter a valid amount")
            return
        }

        if (amountNum > dbBalance) {
            setError(`Insufficient balance. You have ${dbBalance} LINE available.`)
            return
        }

        setError(null)
        setStep("authorizing")

        try {
            // Step 1: Request authorization from backend
            console.log("[Withdrawal] Step 1: Requesting authorization for", amountNum, "LINE")
            const authResponse = await fetch("/api/withdrawals/authorize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: amountNum })
            })

            const authData = await authResponse.json()
            console.log("[Withdrawal] Step 1 Result:", authData)

            if (!authData.success) {
                throw new Error(authData.message || "Failed to authorize withdrawal")
            }

            setAuthorization(authData.authorization)
            setStep("submitting")

            // Step 2: Submit to contract via SubWallet
            console.log("[Withdrawal] Step 2: Submitting to contract...")
            const txHashResult = await submitToContract(authData.authorization)
            console.log("[Withdrawal] Step 2 Result - txHash:", txHashResult)
            setTxHash(txHashResult)
            setStep("confirming")

            // Step 3: Confirm with backend
            console.log("[Withdrawal] Step 3: Confirming with backend...")
            const confirmResponse = await fetch("/api/withdrawals/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    withdrawalId: authData.authorization.withdrawalId,
                    txHash: txHashResult,
                    amount: amountNum
                })
            })

            const confirmData = await confirmResponse.json()
            console.log("[Withdrawal] Step 3 Result:", confirmData)

            if (!confirmData.success) {
                throw new Error(confirmData.message || "Failed to confirm withdrawal")
            }

            setStep("success")

            // Refresh wallet state
            if (wallet.addressRaw) {
                dispatch(fetchWalletState(wallet.addressRaw))
            }

        } catch (err) {
            console.error("Withdrawal error:", err)
            console.error("Error type:", typeof err)
            console.error("Error stringified:", JSON.stringify(err, Object.getOwnPropertyNames(err)))
            setError(err instanceof Error ? err.message : "Withdrawal failed")
            setStep("error")
        }
    }

    const submitToContract = async (auth: WithdrawalAuth): Promise<string> => {
        // Check if SubWallet is available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const injectedWeb3 = (window as any).injectedWeb3
        const subwallet = injectedWeb3?.['subwallet-js']
        if (!subwallet) {
            throw new Error("SubWallet not found. Please install SubWallet extension.")
        }

        // Import Sails and Gear API
        const { Sails } = await import("sails-js")
        const { SailsIdlParser } = await import("sails-js-parser")
        const { GearApi } = await import("@gear-js/api")

        // Connect to Vara testnet
        const api = await GearApi.create({
            providerAddress: "wss://testnet.vara.network"
        })

        try {
            // Enable SubWallet
            console.log("[Withdrawal] 1. Enabling SubWallet...")
            const extension = await subwallet.enable()
            console.log("[Withdrawal] 2. SubWallet enabled")

            // Fetch the IDL
            console.log("[Withdrawal] 3. Fetching IDL...")
            const idlResponse = await fetch("/contracts/line_token.idl")
            const idl = await idlResponse.text()
            console.log("[Withdrawal] 4. IDL fetched, length:", idl.length)

            // Create Sails instance with parser
            console.log("[Withdrawal] 5. Creating Sails parser...")
            const parser = new SailsIdlParser()
            await parser.init()
            console.log("[Withdrawal] 6. Parser initialized")

            const sails = new Sails(parser)
            console.log("[Withdrawal] 7. Sails created")

            sails.parseIdl(idl)
            console.log("[Withdrawal] 8. IDL parsed, services:", Object.keys(sails.services || {}))

            sails.setApi(api)
            console.log("[Withdrawal] 9. API set")

            sails.setProgramId(auth.contractAddress as `0x${string}`)
            console.log("[Withdrawal] 10. Program ID set:", auth.contractAddress)

            // Convert hex strings to byte arrays
            const withdrawalIdBytes = hexToBytes(auth.withdrawalId)
            const signatureBytes = hexToBytes(auth.signature)
            console.log("[Withdrawal] 11. Bytes converted - withdrawalId length:", withdrawalIdBytes.length, "signature length:", signatureBytes.length)

            // Build the transaction using Sails
            console.log("[Withdrawal] 12. Building transaction with args:", {
                amount: auth.amount,
                expiry: auth.expiry,
                withdrawalIdBytesLength: withdrawalIdBytes.length,
                signatureBytesLength: signatureBytes.length
            })

            // The Withdraw function: Withdraw(amount: u256, withdrawal_id: [u8, 32], expiry: u64, signature: vec u8)
            const transaction = sails.services.Line.functions.Withdraw(
                BigInt(auth.amount),                    // amount as bigint (u256)
                Array.from(withdrawalIdBytes),          // withdrawal_id as [u8, 32]
                BigInt(auth.expiry),                    // expiry as u64
                Array.from(signatureBytes)              // signature as vec u8
            )
            console.log("[Withdrawal] 13. Transaction built")

            // Get the account to sign with
            const accounts = await extension.accounts.get()

            // Import address utilities
            const { decodeAddress } = await import("@polkadot/util-crypto")
            const { u8aToHex } = await import("@polkadot/util")

            // Convert our stored address to hex for comparison
            let targetHex = wallet.addressRaw || ""
            if (wallet.address && !wallet.addressRaw) {
                try {
                    targetHex = u8aToHex(decodeAddress(wallet.address))
                } catch {
                    targetHex = wallet.address
                }
            }

            // Find matching account by converting each to hex
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const account = accounts.find((a: any) => {
                try {
                    const accountHex = u8aToHex(decodeAddress(a.address))
                    return accountHex.toLowerCase() === targetHex.toLowerCase()
                } catch {
                    return a.address.toLowerCase() === (wallet.address || "").toLowerCase()
                }
            })

            if (!account) {
                console.error("Available accounts:", accounts.map((a: { address: string }) => a.address))
                console.error("Looking for:", wallet.address, wallet.addressRaw)
                throw new Error("Account not found in SubWallet. Make sure you're using the same account.")
            }

            console.log("[Withdrawal] 14. Using account:", account.address)
            console.log("[Withdrawal] 15. App wallet address:", wallet.address)
            console.log("[Withdrawal] 16. App wallet addressRaw:", wallet.addressRaw)

            // Set the signer from SubWallet
            transaction.withAccount(account.address, { signer: extension.signer })
            transaction.withGas(BigInt("250000000000"))  // 250 billion gas

            console.log("[Withdrawal] 17. Calling signAndSend...")

            // Sign and send
            console.log("[Withdrawal] 18. Signing and sending...")
            const result = await transaction.signAndSend()
            console.log("[Withdrawal] 19. Transaction result:", result)
            console.log("[Withdrawal] 19a. Result type:", typeof result)
            console.log("[Withdrawal] 19b. Result JSON:", JSON.stringify(result, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ))

            // Wait for the transaction to be in block
            const blockHash = result.blockHash
            console.log("[Withdrawal] 20. Block hash:", blockHash)
            console.log("[Withdrawal] 20a. Message ID:", result.msgId)
            console.log("[Withdrawal] 20b. Tx Hash:", result.txHash)

            // Get the actual contract response
            if (result.response && typeof result.response === 'function') {
                try {
                    console.log("[Withdrawal] 21. Awaiting contract response...")
                    const contractResponse = await result.response()
                    console.log("[Withdrawal] 22. Contract returned:", contractResponse)

                    if (contractResponse === false) {
                        throw new Error("Contract returned false - withdrawal failed")
                    }
                } catch (responseError) {
                    console.error("[Withdrawal] Error getting response:", responseError)
                    // Don't throw here - transaction might have succeeded but response reading failed
                }
            }

            // Disconnect after transaction
            await api.disconnect()

            return blockHash

        } catch (error) {
            await api.disconnect()
            throw error
        }
    }

    // Helper to convert hex string to Uint8Array
    const hexToBytes = (hex: string): Uint8Array => {
        const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex
        const bytes = new Uint8Array(cleanHex.length / 2)
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16)
        }
        return bytes
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl neon-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                            <ArrowUpRight className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Withdraw LINE</h2>
                            <p className="text-xs text-muted-foreground">Transfer to on-chain</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === "input" && (
                        <div className="space-y-4">
                            {/* Balance Info */}
                            <div className="p-4 rounded-xl bg-muted/50">
                                <p className="text-sm text-muted-foreground mb-1">Available Balance (Off-chain)</p>
                                <p className="text-2xl font-bold text-primary">{dbBalance.toLocaleString()} LINE</p>
                            </div>

                            {/* Amount Input */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">Amount to Withdraw</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="pr-20 text-lg"
                                        min={0}
                                        max={dbBalance}
                                    />
                                    <button
                                        onClick={handleMaxClick}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-primary hover:text-primary/80"
                                    >
                                        MAX
                                    </button>
                                </div>
                            </div>

                            {/* Gas Warning */}
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 text-yellow-500 text-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">Gas Fee Required</p>
                                    <p className="text-xs opacity-80">You&apos;ll need VARA in your wallet to pay the transaction fee.</p>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Withdraw Button */}
                            <Button
                                onClick={handleWithdraw}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                                disabled={!amount || parseFloat(amount) <= 0}
                            >
                                <ArrowUpRight className="w-4 h-4 mr-2" />
                                Withdraw LINE
                            </Button>
                        </div>
                    )}

                    {(step === "authorizing" || step === "submitting" || step === "confirming") && (
                        <div className="text-center py-8">
                            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                            <p className="font-medium mb-2">
                                {step === "authorizing" && "Authorizing withdrawal..."}
                                {step === "submitting" && "Please confirm in SubWallet..."}
                                {step === "confirming" && "Confirming transaction..."}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {step === "authorizing" && "Getting signature from server"}
                                {step === "submitting" && "Sign the transaction to withdraw your LINE tokens"}
                                {step === "confirming" && "Waiting for blockchain confirmation"}
                            </p>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Withdrawal Successful!</h3>
                            <p className="text-muted-foreground mb-4">
                                {authorization?.amountHuman} LINE tokens have been withdrawn to your on-chain wallet.
                            </p>
                            {txHash && (
                                <a
                                    href={`https://idea.gear-tech.io/explorer/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary text-sm hover:underline"
                                >
                                    View on Explorer →
                                </a>
                            )}
                            <Button onClick={handleClose} className="w-full mt-4">
                                Done
                            </Button>
                        </div>
                    )}

                    {step === "error" && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-destructive" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Withdrawal Failed</h3>
                            <p className="text-muted-foreground mb-4">{error}</p>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
                                    Cancel
                                </Button>
                                <Button onClick={() => setStep("input")} className="flex-1">
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
