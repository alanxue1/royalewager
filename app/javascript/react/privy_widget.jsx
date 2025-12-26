import React, { useEffect, useMemo, useState } from "react"
import { useFundWallet, usePrivy, useSolanaWallets } from "@privy-io/react-auth"
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"

function showToast({ message, tone, href, hrefText }) {
  window.dispatchEvent(
    new CustomEvent("royale:toast", {
      detail: { message, tone, href, hrefText },
    }),
  )
}

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

function csrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]')
  return meta?.getAttribute("content") || ""
}

async function upsertRailsSession({ access_token, privy_user_id, email, primary_wallet_address }) {
  const res = await fetch("/privy_session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken(),
      Accept: "application/json",
    },
    body: JSON.stringify({ access_token, privy_user_id, email, primary_wallet_address }),
    credentials: "same-origin",
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`privy_session create failed: ${res.status} ${body.slice(0, 300)}`)
  }

  return await res.json()
}

async function destroyRailsSession() {
  await fetch("/privy_session", {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken(), Accept: "application/json" },
    credentials: "same-origin",
  })
}

export function PrivyWidget({ variant, solanaCluster, solanaRpcUrl }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy()
  const { wallets: solWallets } = useSolanaWallets()
  const { fundWallet } = useFundWallet()

  const [lastSyncError, setLastSyncError] = useState("")
  const [syncAttempt, setSyncAttempt] = useState(0)
  const [didBindSession, setDidBindSession] = useState(false)
  const [fundBusy, setFundBusy] = useState(false)
  const [fundMsg, setFundMsg] = useState("") // kept for landing debug
  const [balanceLamports, setBalanceLamports] = useState(null)
  const [balanceBusy, setBalanceBusy] = useState(false)

  const copySolanaAddress = async () => {
    if (!solanaAddress) return
    await navigator.clipboard.writeText(solanaAddress)
    showToast({ tone: "success", message: "Copied Solana address" })
  }

  const solanaAddress = useMemo(() => {
    const fromSolWallets = (solWallets || []).flatMap((w) => [w?.publicKey, w?.address])
    const fromUserWallet = user?.wallet?.address
    const fromLinkedSol =
      user?.linkedAccounts?.find((a) => a?.type === "wallet" && a?.chain_type === "solana")?.address

    return firstValidSolanaPubkey([...fromSolWallets, fromLinkedSol, fromUserWallet])
  }, [solWallets, user])

  const hasSolanaWallet = Boolean(solanaAddress)

  const refreshBalance = async () => {
    if (!solanaAddress) return
    setBalanceBusy(true)
    try {
      const connection = new Connection(solanaRpcUrl || "https://api.devnet.solana.com", "confirmed")
      const pubkey = new PublicKey(solanaAddress)
      const lamports = await connection.getBalance(pubkey, "confirmed")
      setBalanceLamports(lamports)
    } catch (e) {
      // ignore (balance is non-critical UI)
    } finally {
      setBalanceBusy(false)
    }
  }

  useEffect(() => {
    if (!ready || !authenticated) return
    if (!solanaAddress) return

    let cancelled = false
    ;(async () => {
      await refreshBalance()
      if (cancelled) return
    })()

    const t = window.setInterval(() => {
      refreshBalance()
    }, 15_000)

    // Listen for balance refresh requests (e.g., after transactions)
    const handleBalanceRefresh = () => {
      refreshBalance()
    }
    window.addEventListener("royale:refreshBalance", handleBalanceRefresh)

    return () => {
      cancelled = true
      window.clearInterval(t)
      window.removeEventListener("royale:refreshBalance", handleBalanceRefresh)
    }
  }, [ready, authenticated, solanaAddress, solanaRpcUrl])

  const goToWagers = () => {
    const turbo = window.Turbo
    if (turbo && typeof turbo.visit === "function") {
      turbo.visit("/wagers")
      return
    }
    window.location.assign("/wagers")
  }

  useEffect(() => {
    if (variant !== "landing") return
    if (!ready || !authenticated) return
    if (!user?.id) return
    if (!solanaAddress) return

    let cancelled = false
    ;(async () => {
      try {
        setLastSyncError("")
        const access_token = await getAccessToken()
        if (!access_token) throw new Error("Privy access token missing")

        const result = await upsertRailsSession({
          access_token,
          privy_user_id: user.id,
          email: user?.email?.address || "",
          primary_wallet_address: solanaAddress,
        })
        if (cancelled) return
        setDidBindSession(true)

        if (window.location.pathname === "/") {
          if (result.onboarding_required) {
            const turbo = window.Turbo
            if (turbo && typeof turbo.visit === "function") {
              turbo.visit("/onboarding")
              return
            }
            window.location.assign("/onboarding")
          } else {
          goToWagers()
          }
        }
      } catch (e) {
        if (cancelled) return
        setLastSyncError(e instanceof Error ? e.message : String(e))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [variant, ready, authenticated, user?.id, solanaAddress, user?.email?.address, syncAttempt])

  const onFund = async ({ solanaCluster, solanaRpcUrl }) => {
    if (!solanaAddress) {
      showToast({ tone: "error", message: "No Solana wallet linked yet. Log out and log in again to create one." })
      return
    }
    setFundBusy(true)
    setFundMsg("")
    try {
      if (solanaCluster === "devnet") {
        const connection = new Connection(solanaRpcUrl || "https://api.devnet.solana.com", "confirmed")
        const pubkey = new PublicKey(solanaAddress)
        const sig = await connection.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL)
        await connection.confirmTransaction(sig, "confirmed")
        await refreshBalance()
        showToast({ tone: "success", message: `Airdrop sent: ${sig}` })
        return
      }

      await fundWallet({ address: solanaAddress })
      await refreshBalance()
      showToast({ tone: "success", message: "Funding flow opened" })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const isAirdrop429 =
        msg.includes('"code": 429') ||
        msg.includes("code\": 429") ||
        msg.includes("airdrop limit") ||
        msg.includes("Too many requests") ||
        msg.includes("run dry")

      if (isAirdrop429 && solanaCluster === "devnet") {
        showToast({
          tone: "error",
          message: "Devnet faucet rate-limited. Use",
          href: "https://faucet.solana.com",
          hrefText: "faucet.solana.com",
        })
        return
      }

      showToast({ tone: "error", message: msg })
    } finally {
      setFundBusy(false)
    }
  }

  const onLogout = async () => {
    try {
      await destroyRailsSession()
    } finally {
      await logout()
      window.location.href = "/"
    }
  }

  const onBack = async () => {
    // On the main wagers index page, log out.
    if (window.location.pathname === "/wagers") {
      await onLogout()
      return
    }

    // Everywhere else: go to the main wagers page.
    const turbo = window.Turbo
    if (turbo && typeof turbo.visit === "function") {
      turbo.visit("/wagers")
      return
    }
    window.location.assign("/wagers")
  }

  if (!ready) {
    return <div className="text-sm text-gray-400">Loading…</div>
  }

  if (!authenticated) {
    if (variant === "landing") {
      return (
        <button
          type="button"
          className="cursor-pointer rounded-lg bg-black px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:bg-slate-950"
          onClick={login}
        >
          Login (Privy)
        </button>
      )
    }

    return null
  }

  if (variant === "landing") {
    if (lastSyncError) {
      return (
        <div className="text-sm text-red-600">
          <div>Login succeeded, but Rails session bind failed:</div>
          <div className="mt-1 break-words font-mono text-xs text-red-700">{lastSyncError}</div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm"
              onClick={() => setSyncAttempt((n) => n + 1)}
            >
              Retry
            </button>
            <button type="button" className="rounded border px-3 py-2 text-sm" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      )
    }

    if (!solanaAddress) {
      return <div className="text-sm text-gray-600">Creating wallet…</div>
    }

    if (!didBindSession) {
      return <div className="text-sm text-gray-600">Binding session…</div>
    }

    return <div className="text-sm text-gray-600">Redirecting…</div>
  }

  if (variant === "logout_only") {
    return (
      <button
        type="button"
        className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:bg-slate-100 sm:left-6 sm:top-6"
        onClick={onBack}
        aria-label="Back"
        title="Back"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M10 19l-7-7 7-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 12h18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    )
  }

  if (variant === "fund_only") {
    const balanceSolFixed = typeof balanceLamports === "number" ? (balanceLamports / LAMPORTS_PER_SOL).toFixed(3) : ""

    return (
      <div className="w-full">
        <div className="text-center">
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">
            {balanceBusy ? "…" : balanceSolFixed || "—"} <span className="text-base font-semibold text-slate-600">SOL</span>
          </div>
        </div>

        <div className="mt-4 grid w-full grid-cols-2 gap-2">
          <button
            type="button"
            className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={copySolanaAddress}
            disabled={!hasSolanaWallet}
          >
            Copy
          </button>

          <button
            type="button"
            className="w-full cursor-pointer rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onFund({ solanaCluster: solanaCluster || "devnet", solanaRpcUrl })}
            disabled={!hasSolanaWallet || fundBusy}
          >
            {fundBusy ? "Funding…" : solanaCluster === "devnet" ? "Airdrop 1 SOL" : "Fund wallet"}
          </button>
        </div>

        {!hasSolanaWallet ? (
          <div className="mt-3 text-center text-xs text-slate-600">No Solana wallet yet. Logout + login again.</div>
        ) : null}
      </div>
    )
  }

  return null
}


