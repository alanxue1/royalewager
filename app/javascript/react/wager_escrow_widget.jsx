import React, { useMemo, useState } from "react"
import { usePrivy, useSolanaWallets } from "@privy-io/react-auth"
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js"

function csrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]')
  return meta?.getAttribute("content") || ""
}

function u64le(n) {
  const out = new Uint8Array(8)
  let x = BigInt(n)
  for (let i = 0; i < 8; i++) {
    out[i] = Number(x & 0xffn)
    x >>= 8n
  }
  return out
}

function i64le(n) {
  const out = new Uint8Array(8)
  let x = BigInt(n)
  if (x < 0) x = (1n << 64n) + x
  for (let i = 0; i < 8; i++) {
    out[i] = Number(x & 0xffn)
    x >>= 8n
  }
  return out
}

function textSeed(s) {
  return new TextEncoder().encode(s)
}

function parseBool(s) {
  return s === "true" || s === true
}

async function postJSON(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken(),
      Accept: "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : {}
}

async function anchorDiscriminator(name) {
  const preimage = new TextEncoder().encode(`global:${name}`)
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", preimage))
  return hash.slice(0, 8)
}

function concatBytes(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

export function WagerEscrowWidget({ el }) {
  const { ready, authenticated } = usePrivy()
  const { ready: solReady, wallets: solWallets } = useSolanaWallets()

  const [busy, setBusy] = useState(false)
  const [lastSig, setLastSig] = useState("")
  const [err, setErr] = useState("")

  const data = useMemo(() => {
    const d = el.dataset
    return {
      wagerId: d.wagerId,
      amountLamports: d.amountLamports,
      deadlineUnixTimestamp: d.deadlineUnixTimestamp,
      status: d.status,
      isCreator: parseBool(d.isCreator),
      isJoiner: parseBool(d.isJoiner),
      hasJoiner: parseBool(d.hasJoiner),
      solanaCluster: d.solanaCluster || "devnet",
      solanaRpcUrl: d.solanaRpcUrl || "https://api.devnet.solana.com",
      escrowProgramId: d.escrowProgramId || "",
      oraclePubkey: d.oraclePubkey || "",
    }
  }, [el])

  const solWallet = solWallets?.[0]

  const vaultAddress = useMemo(() => {
    if (!data.escrowProgramId) return ""
    if (!data.wagerId) return ""
    const programId = new PublicKey(data.escrowProgramId)
    const [vault] = PublicKey.findProgramAddressSync(
      [textSeed("vault"), u64le(data.wagerId)],
      programId,
    )
    return vault.toBase58()
  }, [data.escrowProgramId, data.wagerId])

  const canCreatorDeposit = data.status === "awaiting_creator_deposit" && data.isCreator
  const canJoinAndDeposit = data.status === "awaiting_joiner_deposit" && !data.isCreator

  const sendCreate = async () => {
    if (!solWallet?.address) throw new Error("No Solana wallet")
    if (!data.escrowProgramId) throw new Error("Missing ESCROW_PROGRAM_ID")
    if (!data.oraclePubkey) throw new Error("Missing ORACLE_AUTHORITY_PUBKEY")

    const lamports = Number(data.amountLamports)
    if (!Number.isSafeInteger(lamports) || lamports <= 0) {
      throw new Error("Invalid lamports amount")
    }

    const deadline = Number(data.deadlineUnixTimestamp)
    if (!Number.isSafeInteger(deadline) || deadline <= 0) {
      throw new Error("Invalid deadline")
    }

    const connection = new Connection(data.solanaRpcUrl, "confirmed")
    const creatorPubkey = new PublicKey(solWallet.address)
    const programId = new PublicKey(data.escrowProgramId)
    const wagerId = BigInt(data.wagerId)

    const [escrowPda] = PublicKey.findProgramAddressSync(
      [textSeed("escrow"), u64le(wagerId)],
      programId,
    )
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [textSeed("vault"), u64le(wagerId)],
      programId,
    )

    const disc = await anchorDiscriminator("create")
    const dataBytes = concatBytes(
      disc,
      u64le(wagerId),
      u64le(lamports),
      i64le(deadline),
      new PublicKey(data.oraclePubkey).toBytes(),
    )

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: creatorPubkey, isSigner: true, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(dataBytes),
    })

    const tx = new Transaction().add(ix)
    tx.feePayer = creatorPubkey
    tx.recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash

    const sig = await solWallet.sendTransaction(tx, connection, { preflightCommitment: "confirmed" })
    setLastSig(sig)

    await postJSON(`/wagers/${data.wagerId}/creator_deposit`, { signature: sig })

    window.location.reload()
  }

  const sendJoin = async () => {
    if (!solWallet?.address) throw new Error("No Solana wallet")
    if (!data.escrowProgramId) throw new Error("Missing ESCROW_PROGRAM_ID")

    const connection = new Connection(data.solanaRpcUrl, "confirmed")
    const joinerPubkey = new PublicKey(solWallet.address)
    const programId = new PublicKey(data.escrowProgramId)
    const wagerId = BigInt(data.wagerId)

    const [escrowPda] = PublicKey.findProgramAddressSync(
      [textSeed("escrow"), u64le(wagerId)],
      programId,
    )
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [textSeed("vault"), u64le(wagerId)],
      programId,
    )

    const disc = await anchorDiscriminator("join")
    const dataBytes = concatBytes(disc, u64le(wagerId))

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: joinerPubkey, isSigner: true, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(dataBytes),
    })

    const tx = new Transaction().add(ix)
    tx.feePayer = joinerPubkey
    tx.recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash

    const sig = await solWallet.sendTransaction(tx, connection, { preflightCommitment: "confirmed" })
    setLastSig(sig)

    // Rails will set joiner if missing and mark active.
    await postJSON(`/wagers/${data.wagerId}/joiner_deposit`, { signature: sig })
    window.location.reload()
  }

  const onCreatorDeposit = async () => {
    setBusy(true)
    try {
      setErr("")
      await sendCreate()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onJoinAndDeposit = async () => {
    setBusy(true)
    try {
      setErr("")
      await sendJoin()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const explorerTxUrl = useMemo(() => {
    if (!lastSig) return ""
    const cluster = data.solanaCluster
    const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${encodeURIComponent(cluster)}`
    return `https://explorer.solana.com/tx/${lastSig}${suffix}`
  }, [lastSig, data.solanaCluster])

  if (!ready || !solReady) return <div className="text-sm text-gray-500">Loading wallet…</div>
  if (!authenticated) return <div className="text-sm text-gray-500">Login to deposit.</div>

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase text-gray-500">Escrow</div>
      <div className="text-sm text-gray-700">
        Vault: <span className="font-mono break-all">{vaultAddress || "(set ESCROW_PROGRAM_ID)"}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canCreatorDeposit ? (
          <button
            type="button"
            className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={onCreatorDeposit}
            disabled={busy}
          >
            Deposit (creator)
          </button>
        ) : null}

        {canJoinAndDeposit ? (
          <button
            type="button"
            className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={onJoinAndDeposit}
            disabled={busy}
          >
            Join + deposit
          </button>
        ) : null}
      </div>

      {explorerTxUrl ? (
        <div className="text-xs">
          Last tx:{" "}
          <a className="font-mono underline" href={explorerTxUrl} target="_blank" rel="noreferrer">
            {lastSig}
          </a>
        </div>
      ) : null}

      {err ? <div className="text-xs text-red-600">{err}</div> : null}
    </div>
  )
}


