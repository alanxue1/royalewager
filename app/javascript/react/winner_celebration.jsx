import React, { useEffect, useMemo, useState, useRef } from "react"
import { usePrivy, useSolanaWallets } from "@privy-io/react-auth"
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"

function firstValidSolanaPubkey(candidates) {
  for (const c of candidates) {
    const s = (c || "").toString().trim()
    if (!s) continue
    try {
      return new PublicKey(s).toBase58()
    } catch {
      // ignore
    }
  }
  return ""
}

function parseBool(s) {
  return s === "true" || s === true
}

export function WinnerCelebration({ el }) {
  const { ready, authenticated, user } = usePrivy()
  const { wallets: solWallets } = useSolanaWallets()

  const [isInitialized, setIsInitialized] = useState(false)

  const pollingIntervalRef = useRef(null)
  const emittedRef = useRef(false)

  // Parse data attributes
  const wagerId = el?.dataset?.wagerId || ""
  const wagerStatus = el?.dataset?.wagerStatus || ""
  const isWinner = parseBool(el?.dataset?.isWinner)
  const amountSol = parseFloat(el?.dataset?.amountSol || "0")
  const solanaRpcUrl = el?.dataset?.solanaRpcUrl || "https://api.devnet.solana.com"

  // Get user's Solana wallet address
  const solanaAddress = useMemo(() => {
    const fromSolWallets = (solWallets || []).flatMap((w) => [w?.publicKey, w?.address])
    const fromUserWallet = user?.wallet?.address
    const fromLinkedSol =
      user?.linkedAccounts?.find((a) => a?.type === "wallet" && a?.chain_type === "solana")?.address

    return firstValidSolanaPubkey([...fromSolWallets, fromLinkedSol, fromUserWallet])
  }, [solWallets, user])

  const localStorageKey = `wager_${wagerId}_balance_before`
  const localStorageCelebratedKey = `wager_${wagerId}_celebrated_balance`
  const canTrack = Boolean(ready && authenticated && solanaAddress && isWinner && (wagerStatus === "resolved" || wagerStatus === "settled"))

  const fetchBalance = async () => {
    if (!solanaAddress) return null

    try {
      const connection = new Connection(solanaRpcUrl, "confirmed")
      const pubkey = new PublicKey(solanaAddress)
      const lamports = await connection.getBalance(pubkey, "confirmed")
      return lamports
    } catch (e) {
      console.warn("Failed to fetch balance for celebration:", e)
      return null
    }
  }

  const emitWinBalanceChange = ({ startLamports, endLamports }) => {
    if (emittedRef.current) return
    emittedRef.current = true

    window.dispatchEvent(
      new CustomEvent("royale:wagerWinBalanceChange", {
        detail: {
          wagerId,
          startLamports,
          endLamports,
          deltaLamports: endLamports - startLamports,
        },
      }),
    )

    // Let the wallet widget also refresh its live balance as a fallback
    window.dispatchEvent(new CustomEvent("royale:refreshBalance"))
  }

  // Initialize balance tracking
  useEffect(() => {
    if (!canTrack || isInitialized) return

    const initialize = async () => {
      const stored = localStorage.getItem(localStorageKey)
      const celebratedStored = localStorage.getItem(localStorageCelebratedKey)
      const currentBalance = await fetchBalance()

      if (currentBalance === null) return

      const minIncrease = amountSol * 2 * LAMPORTS_PER_SOL
      const alreadyCelebratedForThisBalance =
        celebratedStored && parseInt(celebratedStored, 10) === currentBalance

      // If we have a baseline, use it; otherwise if we're already settled, infer a baseline.
      if (stored !== null) {
        const storedBalance = parseInt(stored, 10)
        // Always keep the latest observed balance as the baseline for later visits
        // but only celebrate if it looks like the wager payout.
        if (!alreadyCelebratedForThisBalance && wagerStatus === "settled") {
          if (currentBalance > storedBalance && currentBalance - storedBalance >= minIncrease) {
            emitWinBalanceChange({ startLamports: storedBalance, endLamports: currentBalance })
            localStorage.setItem(localStorageCelebratedKey, currentBalance.toString())
            localStorage.setItem(localStorageKey, currentBalance.toString())
          } else {
            // no celebration; just update baseline
            localStorage.setItem(localStorageKey, currentBalance.toString())
          }
        } else {
          localStorage.setItem(localStorageKey, currentBalance.toString())
        }
      } else {
        if (!alreadyCelebratedForThisBalance && wagerStatus === "settled" && minIncrease > 0) {
          const inferredStart = Math.max(0, currentBalance - minIncrease)
          emitWinBalanceChange({ startLamports: inferredStart, endLamports: currentBalance })
          localStorage.setItem(localStorageCelebratedKey, currentBalance.toString())
        }
        // Always set baseline for future comparisons
        localStorage.setItem(localStorageKey, currentBalance.toString())
      }

      setIsInitialized(true)
    }

    initialize()
  }, [canTrack, isInitialized, wagerStatus, amountSol, localStorageKey, localStorageCelebratedKey])

  // Poll for balance changes
  useEffect(() => {
    if (!canTrack || !isInitialized) return

    const pollBalance = async () => {
      const currentBalance = await fetchBalance()
      if (currentBalance === null) return

      setCurrentBalanceLamports((prevCurrent) => {
        // Get the stored previous balance for comparison
        const stored = localStorage.getItem(localStorageKey)
        const celebratedStored = localStorage.getItem(localStorageCelebratedKey)
        if (stored === null) return prevCurrent === null ? currentBalance : prevCurrent

        const storedBalance = parseInt(stored, 10)
        const alreadyCelebratedForThisBalance =
          celebratedStored && parseInt(celebratedStored, 10) === currentBalance
        
        // Check if balance increased significantly
        const minIncrease = amountSol * 2 * LAMPORTS_PER_SOL
        if (!alreadyCelebratedForThisBalance && wagerStatus === "settled" && currentBalance > storedBalance && currentBalance - storedBalance >= minIncrease) {
          emitWinBalanceChange({ startLamports: storedBalance, endLamports: currentBalance })
          localStorage.setItem(localStorageKey, currentBalance.toString())
          localStorage.setItem(localStorageCelebratedKey, currentBalance.toString())
        }

        return currentBalance
      })
    }

    // Poll every 2.5 seconds
    pollingIntervalRef.current = setInterval(pollBalance, 2500)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [canTrack, isInitialized, wagerStatus, amountSol, localStorageKey, localStorageCelebratedKey])

  // Headless component: the Wallet widget owns the visuals (ticker + confetti).
  return null
}

