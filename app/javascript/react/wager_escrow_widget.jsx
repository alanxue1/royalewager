import React, { useEffect, useMemo, useState } from "react"
import { usePrivy, useSolanaWallets } from "@privy-io/react-auth"
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js"

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

export function WagerEscrowWidget({ el }) {
  const { ready, authenticated, user, getAccessToken } = usePrivy()
  const { ready: solReady, wallets: solWallets } = useSolanaWallets()

  const [busy, setBusy] = useState(false)
  const [lastSig, setLastSig] = useState("")
  const [err, setErr] = useState("")
  const [solReadyTimeout, setSolReadyTimeout] = useState(false)

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:usePrivy',message:'Privy state changed',data:{ready,authenticated,userId:user?.id,hasAccessToken:!!getAccessToken},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,E'})}).catch(()=>{});
  }, [ready, authenticated, user?.id, getAccessToken]);
  // #endregion

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:useSolanaWallets',message:'Solana wallets state changed',data:{solReady,walletsCount:solWallets?.length,wallets:solWallets?.map(w=>({address:w?.address||w?.publicKey,type:w?.walletClientType}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D,E'})}).catch(()=>{});
  }, [solReady, solWallets]);
  // #endregion

  // Give Solana wallets a bit more time to initialize
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:timeoutEffect',message:'Timeout effect state',data:{ready,authenticated,solReady,willTimeout:ready && authenticated && !solReady},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
    // #endregion
    if (ready && authenticated && !solReady) {
      const timer = setTimeout(() => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:timeoutTriggered',message:'Solana wallet timeout triggered',data:{ready,authenticated,solReady},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
        // #endregion
        setSolReadyTimeout(true)
      }, 3000) // Wait 3 seconds before showing timeout message
      return () => clearTimeout(timer)
    } else {
      setSolReadyTimeout(false)
    }
  }, [ready, authenticated, solReady])

  // Sync Rails session when authenticated
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sessionSync:entry',message:'Session sync effect triggered',data:{ready,authenticated,userId:user?.id,solWalletsCount:solWallets?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!ready || !authenticated) return
    if (!user?.id) return

    let cancelled = false
    ;(async () => {
      try {
        const access_token = await getAccessToken()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sessionSync:gotToken',message:'Got access token',data:{hasToken:!!access_token},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        if (!access_token || cancelled) return

        const solanaAddr = firstValidSolanaPubkey([
          ...(solWallets || []).flatMap((w) => [w?.publicKey, w?.address]),
          user?.wallet?.address,
          user?.linkedAccounts?.find((a) => a?.type === "wallet" && a?.chain_type === "solana")?.address,
        ])
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sessionSync:foundAddr',message:'Found Solana address',data:{hasAddress:!!solanaAddr,address:solanaAddr},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,D'})}).catch(()=>{});
        // #endregion

        if (solanaAddr) {
          const result = await upsertRailsSession({
            access_token,
            privy_user_id: user.id,
            email: user?.email?.address || "",
            primary_wallet_address: solanaAddr,
          })
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sessionSync:success',message:'Session sync completed',data:{onboardingRequired:result?.onboarding_required},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
        }
      } catch (e) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sessionSync:error',message:'Session sync failed',data:{error:e instanceof Error ? e.message : String(e)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        // Silently fail - session sync is non-critical for escrow widget
        console.warn("Escrow widget session sync failed:", e)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [ready, authenticated, user?.id, solWallets, getAccessToken])

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

  // Use the same "best address" strategy as the Privy wallet widget so
  // funding/airdrops and transactions are targeting the same wallet.
  const solanaAddress = useMemo(() => {
    const fromSolWallets = (solWallets || []).flatMap((w) => [w?.publicKey, w?.address])
    const fromUserWallet = user?.wallet?.address
    const fromLinkedSol =
      user?.linkedAccounts?.find((a) => a?.type === "wallet" && a?.chain_type === "solana")?.address

    return firstValidSolanaPubkey([...fromSolWallets, fromLinkedSol, fromUserWallet])
  }, [solWallets, user])

  const solWallet = useMemo(() => {
    const wallets = solWallets || []
    if (!wallets.length) return null
    if (solanaAddress) {
      const byAddr = wallets.find((w) => {
        const addr = (w?.address || w?.publicKey || "").toString().trim()
        return addr && addr === solanaAddress
      })
      if (byAddr) return byAddr
    }
    // Prefer privy embedded wallet if present.
    const privy = wallets.find((w) => w?.walletClientType === "privy")
    return privy || wallets[0]
  }, [solWallets, solanaAddress])

  const solWalletAddress = solanaAddress || solWallet?.address || solWallet?.publicKey || ""
  
  // #region agent log
  useEffect(() => {
    if (ready && authenticated) {
      fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:walletSelection',message:'Wallet selection result',data:{solanaAddress,solWalletAddress,selectedWalletAddress:solWallet?.address||solWallet?.publicKey,allWallets:solWallets?.map(w=>({addr:w?.address||w?.publicKey,type:w?.walletClientType})),isCreator:data.isCreator,isJoiner:data.isJoiner,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
    }
  }, [ready, authenticated, solanaAddress, solWalletAddress, solWallet, data.isCreator, data.isJoiner, user?.id, solWallets]);
  // #endregion

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
  const canJoinAndDeposit = data.status === "awaiting_joiner_deposit" && data.isJoiner

  const sendCreate = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendCreate:entry',message:'sendCreate called',data:{solWalletAddress,isCreator:data.isCreator,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    if (!solWalletAddress) throw new Error("No Solana wallet")
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
    const creatorPubkey = new PublicKey(solWalletAddress)
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
    const vaultAddressForVerification = vaultPda.toBase58()

    // Check balance BEFORE transaction
    let balanceBefore = null
    let vaultBalanceBefore = null
    try {
      balanceBefore = await connection.getBalance(creatorPubkey, "confirmed")
      vaultBalanceBefore = await connection.getBalance(vaultPda, "confirmed")
    } catch (e) {
      console.warn("Could not check balances before:", e)
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendCreate:beforeSign',message:'About to sign transaction',data:{creatorPubkey:creatorPubkey.toBase58(),vaultAddress:vaultAddressForVerification,expectedAmount:lamports,balanceBefore,vaultBalanceBefore},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

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
      // Browser-safe: TransactionInstruction accepts Uint8Array.
      data: dataBytes,
    })

    const tx = new Transaction().add(ix)
    tx.feePayer = creatorPubkey
    tx.recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash

    if (typeof solWallet?.sendTransaction !== "function") throw new Error("Solana wallet cannot send transactions")
    
    let sig
    try {
      sig = await solWallet.sendTransaction(tx, connection, { preflightCommitment: "confirmed" })
    setLastSig(sig)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendCreate:txSent',message:'Transaction sent',data:{signature:sig},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendCreate:txError',message:'Transaction send failed',data:{error:e instanceof Error ? e.message : String(e)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      throw e
    }

    // Wait for confirmation and verify vault balance
    try {
      await connection.confirmTransaction(sig, "confirmed")
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendCreate:txConfirmed',message:'Transaction confirmed',data:{signature:sig},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      
      // Get transaction details to see balance changes
      const txDetails = await connection.getTransaction(sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })
      const preBalances = txDetails?.meta?.preBalances || []
      const postBalances = txDetails?.meta?.postBalances || []
      const accountKeys = txDetails?.transaction?.message?.staticAccountKeys || txDetails?.transaction?.message?.accountKeys || []
      const balanceChanges = accountKeys.map((key, idx) => {
        const addr = (key.pubkey || key).toBase58()
        const pre = preBalances[idx] || 0
        const post = postBalances[idx] || 0
        return { address: addr, preBalance: pre, postBalance: post, change: post - pre }
      })
      const creatorBalanceChange = balanceChanges.find(b => b.address === creatorPubkey.toBase58())
      const vaultBalanceChange = balanceChanges.find(b => b.address === vaultAddressForVerification)
      
      const balanceAfter = await connection.getBalance(creatorPubkey, "confirmed")
      const vaultBalanceAfter = await connection.getBalance(vaultPda, "confirmed")
      const balanceDiff = balanceBefore !== null && balanceAfter !== null ? balanceBefore - balanceAfter : null
      const vaultBalanceDiff = vaultBalanceBefore !== null && vaultBalanceAfter !== null ? vaultBalanceAfter - vaultBalanceBefore : null
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendCreate:balanceCheck',message:'Balance changes',data:{balanceChanges:balanceChanges.filter(b => Math.abs(b.change) > 0),creatorAddress:creatorPubkey.toBase58(),vaultAddress:vaultAddressForVerification,expectedAmount:lamports,balanceBefore,balanceAfter,balanceDiff,vaultBalanceBefore,vaultBalanceAfter,vaultBalanceDiff,creatorBalanceChange,vaultBalanceChange,creatorCharged:balanceDiff !== null && balanceDiff > 0,vaultReceived:vaultBalanceDiff !== null && vaultBalanceDiff > 0,expectedVaultGain:lamports,actualVaultGain:vaultBalanceDiff},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendCreate:verifyError',message:'Transaction verification failed',data:{error:e instanceof Error ? e.message : String(e),signature:sig},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      console.warn("Could not verify creator transaction:", e)
    }

    await postJSON(`/wagers/${data.wagerId}/creator_deposit`, { signature: sig })

    // Trigger balance refresh in PrivyWidget before reload
    window.dispatchEvent(new CustomEvent("royale:refreshBalance"))

    window.location.reload()
  }

  const sendJoin = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendJoin:entry',message:'sendJoin called',data:{solWalletAddress,selectedWallet:solWallet?.address||solWallet?.publicKey,isJoiner:data.isJoiner,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    if (!solWalletAddress) throw new Error("No Solana wallet")
    if (!data.escrowProgramId) throw new Error("Missing ESCROW_PROGRAM_ID")
    if (!solWallet) throw new Error("No Solana wallet object")
    
    // CRITICAL: Verify the wallet object matches the address we're using
    const walletAddr = (solWallet?.address || solWallet?.publicKey || "").toString().trim()
    if (walletAddr !== solWalletAddress) {
      throw new Error(`Wallet mismatch: expected ${solWalletAddress}, got ${walletAddr}`)
    }

    const connection = new Connection(data.solanaRpcUrl, "confirmed")
    const joinerPubkey = new PublicKey(solWalletAddress)
    const programId = new PublicKey(data.escrowProgramId)
    const wagerId = BigInt(data.wagerId)
    
    // Calculate vault address for verification
    const [vaultPdaForVerification] = PublicKey.findProgramAddressSync(
      [textSeed("vault"), u64le(wagerId)],
      programId,
    )
    const vaultAddressForVerification = vaultPdaForVerification.toBase58()
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendJoin:pubkey',message:'Using pubkey for join',data:{joinerPubkey:joinerPubkey.toBase58(),wagerId:data.wagerId,walletAddr,vaultAddress:vaultAddressForVerification,expectedAmount:Number(data.amountLamports)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

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
      // Browser-safe: TransactionInstruction accepts Uint8Array.
      data: dataBytes,
    })

    const tx = new Transaction().add(ix)
    tx.feePayer = joinerPubkey
    tx.recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash

    if (typeof solWallet?.sendTransaction !== "function") throw new Error("Solana wallet cannot send transactions")
    
    // Check balance BEFORE transaction
    let balanceBefore = null
    try {
      balanceBefore = await connection.getBalance(joinerPubkey, "confirmed")
    } catch (e) {
      console.warn("Could not check balance before:", e)
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendJoin:beforeSign',message:'About to sign transaction',data:{signingWallet:solWallet?.address||solWallet?.publicKey,joinerPubkey:joinerPubkey.toBase58(),feePayer:tx.feePayer?.toBase58(),wagerId:data.wagerId,balanceBefore,expectedAmount:Number(data.amountLamports)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    let sig
    try {
      sig = await solWallet.sendTransaction(tx, connection, { preflightCommitment: "confirmed" })
    setLastSig(sig)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendJoin:txSent',message:'Transaction sent',data:{signature:sig},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendJoin:txError',message:'Transaction send failed',data:{error:e instanceof Error ? e.message : String(e)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      throw e
    }
    
    // Wait for confirmation and verify which account actually signed
    let actualSigner = null
    let txStatus = null
    let balanceAfter = null
    let vaultBalance = null
    let vaultBalanceChange = null
    let balanceDiff = null
    try {
      await connection.confirmTransaction(sig, "confirmed")
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendJoin:txConfirmed',message:'Transaction confirmed',data:{signature:sig},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      const txDetails = await connection.getTransaction(sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })
      txStatus = txDetails?.meta?.err ? "failed" : "success"
      
      // Extract signer from transaction
      if (txDetails?.transaction) {
        const message = txDetails.transaction.message
        if (message?.staticAccountKeys) {
          // Versioned transaction
          const numSigners = message.header.numRequiredSigners || 0
          actualSigner = message.staticAccountKeys[0]?.toBase58() || null
        } else if (message?.accountKeys) {
          // Legacy transaction
          const numSigners = message.header?.numRequiredSigners || 0
          const signers = message.accountKeys
            .slice(0, numSigners)
            .map(key => (key.pubkey || key).toBase58())
          actualSigner = signers[0] || null
        }
      }
      
      // Check balance changes to verify funds were transferred
      const preBalances = txDetails?.meta?.preBalances || []
      const postBalances = txDetails?.meta?.postBalances || []
      const accountKeys = txDetails?.transaction?.message?.staticAccountKeys || txDetails?.transaction?.message?.accountKeys || []
      const balanceChanges = accountKeys.map((key, idx) => {
        const addr = (key.pubkey || key).toBase58()
        const pre = preBalances[idx] || 0
        const post = postBalances[idx] || 0
        return { address: addr, preBalance: pre, postBalance: post, change: post - pre }
      })
      
      // Also check the vault address specifically
      vaultBalanceChange = balanceChanges.find(b => b.address === vaultAddressForVerification)
      const joinerBalanceChange = balanceChanges.find(b => b.address === joinerPubkey.toBase58())
      
      // Check balance AFTER transaction
      try {
        balanceAfter = await connection.getBalance(joinerPubkey, "confirmed")
      } catch (e) {
        console.warn("Could not check balance after:", e)
      }
      
      // Directly check vault balance on-chain
      try {
        const vaultPubkey = new PublicKey(vaultAddressForVerification)
        vaultBalance = await connection.getBalance(vaultPubkey, "confirmed")
      } catch (e) {
        console.warn("Could not check vault balance:", e)
      }
      
      balanceDiff = balanceBefore !== null && balanceAfter !== null ? balanceBefore - balanceAfter : null
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendJoin:balanceCheck',message:'Balance changes',data:{balanceChanges:balanceChanges.filter(b => Math.abs(b.change) > 0),vaultAddress:vaultAddressForVerification,expectedAmount:Number(data.amountLamports),vaultBalanceChange,joinerBalanceChange,vaultBalanceOnChain:vaultBalance,balanceBefore,balanceAfter,balanceDiff,joinerAddress:joinerPubkey.toBase58()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendJoin:verifyError',message:'Transaction verification failed',data:{error:e instanceof Error ? e.message : String(e),signature:sig},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      console.warn("Could not verify transaction:", e)
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendJoin:afterSign',message:'Transaction signed and verified',data:{signature:sig,usedWallet:solWallet?.address||solWallet?.publicKey,expectedJoinerPubkey:joinerPubkey.toBase58(),actualSigner,txStatus,match:actualSigner===joinerPubkey.toBase58()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    if (txStatus === "failed") {
      throw new Error("Transaction failed on-chain")
    }
    
    if (actualSigner && actualSigner !== joinerPubkey.toBase58()) {
      throw new Error(`Transaction signed by wrong account: expected ${joinerPubkey.toBase58()}, got ${actualSigner}`)
    }

    // Rails will set joiner if missing and mark active.
    await postJSON(`/wagers/${data.wagerId}/joiner_deposit`, { signature: sig })
    
    // Final balance check right before reload to verify on-chain state
    let finalBalance = null
    try {
      finalBalance = await connection.getBalance(joinerPubkey, "confirmed")
    } catch (e) {
      console.warn("Could not check final balance:", e)
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:sendJoin:success',message:'Joiner deposit completed successfully',data:{signature:sig,joinerAddress:joinerPubkey.toBase58(),balanceBefore,balanceAfter,finalBalance,balanceDiff,expectedAmount:Number(data.amountLamports),vaultGained:vaultBalanceChange?.change||0,charged:balanceDiff !== null && balanceDiff > 0,balanceConsistent:balanceAfter === finalBalance},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    // Trigger balance refresh in PrivyWidget before reload
    window.dispatchEvent(new CustomEvent("royale:refreshBalance"))
    
    // Small delay to ensure balance updates are visible before reload
    await new Promise(resolve => setTimeout(resolve, 500))
    window.location.reload()
  }

  const onCreatorDeposit = async () => {
    setBusy(true)
    try {
      setErr("")
      await sendCreate()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setErr(msg)
      showToast({ tone: "error", message: msg })
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
      const msg = e instanceof Error ? e.message : String(e)
      setErr(msg)
      showToast({ tone: "error", message: msg })
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

  if (!ready) return <div className="text-sm text-gray-500">Loading Privy…</div>
  if (!authenticated) return <div className="text-sm text-gray-500">Login to deposit.</div>
  
  // Check if we have wallets even if solReady is false (Privy SDK quirk)
  const hasWallets = solWallets && solWallets.length > 0
  const canProceed = solReady || hasWallets
  
  // #region agent log
  if (ready && authenticated) {
    fetch('http://127.0.0.1:7242/ingest/15fe5027-9a0e-4021-a5d7-6a1186039492',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wager_escrow_widget.jsx:render:check',message:'Wallet readiness check',data:{solReady,hasWallets,canProceed,walletsCount:solWallets?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
  }
  // #endregion
  
  if (!canProceed) {
    if (solReadyTimeout) {
      return (
        <div className="text-sm text-gray-500">
          Solana wallet taking longer than expected. Try refreshing the page.
        </div>
      )
    }
    return <div className="text-sm text-gray-500">Loading Solana wallet…</div>
  }
  if (!solWalletAddress) return <div className="text-sm text-gray-500">No Solana wallet found. Please connect a wallet.</div>

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

    </div>
  )
}


