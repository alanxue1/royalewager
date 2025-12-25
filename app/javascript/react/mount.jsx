import React from "react"
import { createRoot } from "react-dom/client"
import { PrivyProvider } from "@privy-io/react-auth"

import { PrivyWidget } from "./privy_widget"
import { WagerEscrowWidget } from "./wager_escrow_widget"

function mountPrivy() {
  const el = document.getElementById("privy-root")
  if (!el) return

  const appId = el.dataset.privyAppId
  if (!appId) {
    el.innerText = "Missing PRIVY_APP_ID"
    return
  }

  const root = createRoot(el)
  root.render(
    <PrivyProvider
      appId={appId}
      config={{
        appearance: { theme: "dark" },
        embeddedWallets: { createOnLogin: "users-without-wallets" },
      }}
    >
      <PrivyWidget />
    </PrivyProvider>,
  )
}

document.addEventListener("turbo:load", mountPrivy)
document.addEventListener("DOMContentLoaded", mountPrivy)

function mountWagerEscrow() {
  const el = document.getElementById("wager-escrow-root")
  if (!el) return

  const root = createRoot(el)
  root.render(<WagerEscrowWidget el={el} />)
}

document.addEventListener("turbo:load", mountWagerEscrow)
document.addEventListener("DOMContentLoaded", mountWagerEscrow)


