"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks"
import { selectActiveModal, closeModal } from "@/lib/redux/slices/ui-slice"
import { WalletConnectModal } from "./wallet-connect-modal"

/**
 * Wrapper for WalletConnectModal that handles authentication check.
 * If user is not logged in and tries to open the wallet modal,
 * they are redirected to the login page.
 */
export function WalletConnectWrapper() {
    const router = useRouter()
    const { isSignedIn, isLoaded } = useUser()
    const dispatch = useAppDispatch()
    const activeModal = useAppSelector(selectActiveModal)

    useEffect(() => {
        // If modal is trying to open but user is not signed in, redirect to login
        if (isLoaded && activeModal === "wallet-connect" && !isSignedIn) {
            dispatch(closeModal())
            router.push("/login")
        }
    }, [isLoaded, isSignedIn, activeModal, dispatch, router])

    // Only render modal if user is signed in
    if (!isLoaded || !isSignedIn) {
        return null
    }

    return <WalletConnectModal />
}
