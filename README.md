# Ultima

A clear, stablecoin-first yield exploration workspace for Arc.

## Current build

- Responsive dashboard UI for desktop and mobile
- Arc Mainnet context (chain ID 5042)
- USDC-first strategy discovery layout
- Candidate Morpho vault cards with explicit pending-verification status
- Overview, strategies, positions, and activity views
- No fabricated APY, balances, or transaction history

## Important

This first commit is the UI foundation only. Wallet connection, live vault/rate verification, contract interactions, deposits, withdrawals, and onchain transaction history are not yet implemented. Candidate vaults must be verified against current onchain state and interfaces before enabling deposits.

## Run locally

```bash
npm install
npm run dev
```

## Stack

- Next.js App Router
- React and TypeScript
- CSS custom properties and responsive styles
- Lucide icons
