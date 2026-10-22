# Ultima

Ultima is a stablecoin strategy and position-management workspace for Arc. It combines verified strategy discovery with an explicit, non-yield-generating custody/accounting contract foundation.

## Current implementation status

- Responsive Next.js dashboard and strategy UI.
- Circle Earn Kit integration for discovering live Arc Testnet vault metadata and using supported Earn Kit operations.
- Wallet balance and position refresh flows.
- Strategy analysis API backed by Groq when `GROQ_API_KEY` is configured.
- Initial `UltimaVault` Solidity contract for per-user USDC custody/accounting, deposits, withdrawals, owner-controlled deposit pause, and events.
- Foundry tests for deposit/withdrawal accounting, access control, and pause behavior.
- GitHub Actions CI for frontend lint/build and Solidity tests.

**Important:** The new `UltimaVault` contract is source code only until it has been compiled, tested, reviewed, deployed, and wired into the public app. Do not assume it is deployed or that the existing Circle Earn Kit flow routes funds through it. The current Earn Kit integration interacts with the selected external vault returned by Circle Earn Kit. These are separate flows until a verified integration is completed.

A custody contract does not generate yield by itself. Ultima must not claim funds earn yield unless a real, verified strategy adapter is implemented and the position is read from that integration. No contract address, deployment transaction, audit, or Mainnet transaction is claimed by this repository until it is actually verified.

## Networks

- Development target: Arc Testnet.
- Final submission target: Arc Mainnet.
- Confirm official chain configuration and token addresses from Arc/Circle documentation before deployment.
- Never reuse Testnet addresses on Mainnet.

## Run the frontend

Requirements: Node.js 20 or newer.

```bash
npm install
npm run lint
npm run build
npm run dev
```

## Run Solidity tests

Requirements: [Foundry](https://book.getfoundry.sh/).

```bash
forge test -vvv
```

Contract source: `contracts/UltimaVault.sol`  
Tests: `test/UltimaVault.t.sol`

The test token is a local mock and must never be used as a production token.

## Environment variables

- `GROQ_API_KEY` — optional server-side key for strategy analysis. Configure in the deployment environment; never commit its value.

## Before Mainnet

1. Pass frontend lint/build and all contract tests.
2. Independently review contract security and verify the actual USDC address.
3. Test contract integration on Arc Testnet using a funded test wallet.
4. Wire the public app to the actual deployed contract ABI/address.
5. Get explicit user approval before any Mainnet deployment or real-fund transaction.
6. Verify the deployment and sample transaction using the official Arc Explorer.
7. Update this README with only verified deployment details.

## Current limitations

- The `UltimaVault` contract is not yet deployed or integrated into the frontend.
- Circle Earn Kit vault availability and end-to-end deposit/withdraw flows still need funded-wallet verification.
- Activity history currently includes browser-local records for actions made on this device; it is not a complete indexed on-chain history.
- Notification preferences are saved locally and do not yet send email or Telegram notifications.
- Swap availability depends on the live Circle Earn Kit routing and liquidity.
- Strategy analysis requires `GROQ_API_KEY` and is informational, not financial advice.
