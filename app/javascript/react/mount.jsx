import React from "react"
import { createRoot } from "react-dom/client"
import { PrivyProvider } from "@privy-io/react-auth"

import { PrivyWidget } from "./privy_widget"
import { ToastHost } from "./toast_host"
import { WagerEscrowWidget } from "./wager_escrow_widget"

const roots = new WeakMap()
function rootFor(el) {
  const existing = roots.get(el)
  if (existing) return existing
  const root = createRoot(el)
  roots.set(el, root)
  return root
}

function privyConfigFromDataset(d) {
  return {
    appId: d.privyAppId,
    solanaCluster: d.solanaCluster || "devnet",
    solanaRpcUrl: d.solanaRpcUrl || "https://api.devnet.solana.com",
    escrowProgramId: d.escrowProgramId || "",
    variant: d.variant || "",
  }
}

function mountPrivy() {
  const els = document.querySelectorAll("[data-privy-widget]")
  els.forEach((el) => {
    const { appId, variant, solanaCluster, solanaRpcUrl } = privyConfigFromDataset(el.dataset)
    if (!appId) {
      el.innerText = "Missing PRIVY_APP_ID"
      return
    }

    rootFor(el).render(
      <PrivyProvider
        appId={appId}
        config={{
          appearance: { theme: "dark" },
          embeddedWallets: {
            solana: { createOnLogin: "users-without-wallets" },
          },
        }}
      >
        <PrivyWidget variant={variant} solanaCluster={solanaCluster} solanaRpcUrl={solanaRpcUrl} />
      </PrivyProvider>,
    )
  })
}

document.addEventListener("turbo:load", mountPrivy)
document.addEventListener("DOMContentLoaded", mountPrivy)

function mountWagerEscrow() {
  const el = document.getElementById("wager-escrow-root")
  if (!el) return

  const { appId } = privyConfigFromDataset(el.dataset)
  if (!appId) {
    el.innerText = "Missing PRIVY_APP_ID"
    return
  }

  rootFor(el).render(
    <PrivyProvider
      appId={appId}
      config={{
        appearance: { theme: "dark" },
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
        },
      }}
    >
      <WagerEscrowWidget el={el} />
    </PrivyProvider>,
  )
}

document.addEventListener("turbo:load", mountWagerEscrow)
document.addEventListener("DOMContentLoaded", mountWagerEscrow)

function mountToastHost() {
  const el = document.getElementById("toast-root")
  if (!el) return
  rootFor(el).render(<ToastHost />)
}

document.addEventListener("turbo:load", mountToastHost)
document.addEventListener("DOMContentLoaded", mountToastHost)


