import React from "react"
import { createRoot } from "react-dom/client"
import { PrivyProvider } from "@privy-io/react-auth"

import { PrivyWidget } from "./privy_widget"
import { ToastHost } from "./toast_host"
import { WagerEscrowWidget } from "./wager_escrow_widget"
import { WinnerCelebration } from "./winner_celebration"

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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mount.jsx:mountWagerEscrow:entry',message:'Mounting escrow widget',data:{hasElement:!!el,pathname:window.location.pathname},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C'})}).catch(()=>{});
  // #endregion
  if (!el) return

  const { appId } = privyConfigFromDataset(el.dataset)
  if (!appId) {
    el.innerText = "Missing PRIVY_APP_ID"
    return
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mount.jsx:mountWagerEscrow:rendering',message:'Rendering PrivyProvider for escrow',data:{appId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C'})}).catch(()=>{});
  // #endregion
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

function mountWinnerCelebration() {
  const el = document.getElementById("winner-celebration-root")
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
      <WinnerCelebration el={el} />
    </PrivyProvider>,
  )
}

document.addEventListener("turbo:load", mountWinnerCelebration)
document.addEventListener("DOMContentLoaded", mountWinnerCelebration)


