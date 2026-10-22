# Ultima architecture

## Current and intended data flow

```text
Browser / Ultima Next.js app
  ├─ Wallet provider (user signs transactions)
  ├─ Circle Earn Kit
  │    ├─ Discover live supported Arc Testnet vaults
  │    ├─ Quote / deposit / withdraw where supported
  │    └─ Read external-vault position data
  ├─ Strategy analysis API
  │    └─ Groq API (server-side key; optional)
  └─ UltimaVault integration (pending)
       ├─ Read per-user balance and total assets
       ├─ ERC-20 approval if required
       ├─ deposit(amount)
       └─ withdraw(amount)

Arc chain
  ├─ External vault contracts discovered by Circle Earn Kit
  └─ UltimaVault contract (source added; deployment/integration pending)
       ├─ Configured ERC-20 asset
       ├─ Per-user balance accounting
       ├─ Deposit / withdrawal events
       └─ Owner can pause deposits; user withdrawals remain enabled
```

## Trust boundaries

- The chain is the source of truth for contract balances and confirmed transactions.
- AI output is explanatory and must not be treated as a source of on-chain facts.
- Browser-local transaction records are convenience history, not complete on-chain history.
- Circle Earn Kit external-vault positions are distinct from balances held by UltimaVault.
- UltimaVault holds user assets; it does not create yield. A strategy adapter must be separately verified and tested before any yield claim is made.

## Contract assumptions

- Standard ERC-20 asset; fee-on-transfer tokens are rejected.
- Token amount uses the configured token's base units.
- No arbitrary owner sweep of user funds.
- Deposits can be paused by the owner; withdrawals remain enabled.
- No fee, leverage, lending, or yield routing is implemented in the initial contract.
