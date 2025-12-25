import React, { useEffect, useMemo, useState } from "react"
import { useFundWallet, usePrivy, useWallets } from "@privy-io/react-auth"

function csrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]')
  return meta?.getAttribute("content") || ""
}

async function upsertRailsSession({ privy_user_id, email, primary_wallet_address }) {
  const res = await fetch("/privy_session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken(),
      Accept: "application/json",
    },
    body: JSON.stringify({ privy_user_id, email, primary_wallet_address }),
    credentials: "same-origin",
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`privy_session create failed: ${res.status} ${body.slice(0, 300)}`)
  }
}

export function PrivyWidget() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const { fundWallet } = useFundWallet()

  const [lastSyncError, setLastSyncError] = useState("")

  const primaryAddress = useMemo(() => {
    const w = wallets?.[0]
    return (
      w?.address ||
      user?.wallet?.address ||
      user?.linkedAccounts?.find((a) => a?.type === "wallet")?.address ||
      ""
    )
  }, [wallets, user])

  useEffect(() => {
    if (!ready || !authenticated) return
    if (!user?.id) return
    if (!primaryAddress) return

    let cancelled = false
    ;(async () => {
      try {
        setLastSyncError("")
        await upsertRailsSession({
          privy_user_id: user.id,
          email: user?.email?.address || "",
          primary_wallet_address: primaryAddress,
        })
      } catch (e) {
        if (cancelled) return
        setLastSyncError(e instanceof Error ? e.message : String(e))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [ready, authenticated, user?.id, primaryAddress, user?.email?.address])

  const onFund = async () => {
    if (!primaryAddress) return
    await fundWallet({ address: primaryAddress })
  }

  const onCopy = async () => {
    if (!primaryAddress) return
    await navigator.clipboard.writeText(primaryAddress)
  }

  if (!ready) {
    return <div className="text-sm text-gray-400">Loading…</div>
  }

  if (!authenticated) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded bg-black px-3 py-2 text-sm font-medium text-white"
          onClick={login}
        >
          Login (Privy)
        </button>
        <div className="text-xs text-gray-500">Creates an embedded Solana wallet on login.</div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="rounded border px-2 py-1 font-mono text-xs">{primaryAddress || "no wallet"}</div>
      <button
        type="button"
        className="rounded border px-2 py-1 text-xs"
        onClick={onCopy}
        disabled={!primaryAddress}
      >
        Copy
      </button>
      <button
        type="button"
        className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        onClick={onFund}
        disabled={!primaryAddress}
      >
        Fund wallet
      </button>
      <button type="button" className="rounded border px-2 py-1 text-xs" onClick={logout}>
        Logout
      </button>
      {lastSyncError ? <div className="w-full text-xs text-red-600">{lastSyncError}</div> : null}
    </div>
  )
}


