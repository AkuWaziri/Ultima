# Ultima

Ultima is a stablecoin strategy and position-management workspace for Arc. It combines verified strategy discovery with an explicit, non-yield-generating custody/accounting contract foundation.

## Current implementation status

- Responsive Next.js dashboard and strategy UI.
- Circle Earn Kit integration for discovering live Arc Testnet vault metadata and using supported Earn Kit operations.
- Wallet balance and position refresh flows.
- Strategy analysis API backed by Groq when `GROQ_API_KEY` is configured.
- `UltimaVault` Solidity contract source for per-user USDC and EURC custody/accounting, with independent balances, deposits, withdrawals, owner-controlled deposit pause, and events.
- Frontend wiring for direct `UltimaVault` reads, token-specific USDC/EURC approvals, deposits, withdrawals, receipt polling, and Arc Testnet explorer links. This flow activates only when `NEXT_PUBLIC_ULTIMA_VAULT_ADDRESS` points to a compatible deployed two-token contract.
- Foundry tests for independent USDC/EURC accounting, deposit/withdrawal, unsupported-token rejection, access control, and pause behavior.
- GitHub Actions CI for frontend lint/build and Solidity tests.

**Important:** The `UltimaVault` source has not yet been verified by a successful test run or security review, and no deployment address is configured by default. The app's direct contract panel remains inactive until `NEXT_PUBLIC_ULTIMA_VAULT_ADDRESS` is configured with the actual Arc Testnet deployment address. The existing Circle Earn Kit flow interacts with selected external vaults; it is separate from UltimaVault.

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
- `NEXT_PUBLIC_ULTIMA_VAULT_ADDRESS` — public address of the deployed `UltimaVault` contract for the current environment. Set to the verified Arc Testnet address for testing. Do not set a Mainnet address in a Testnet deployment.

## Before Mainnet

1. Pass frontend lint/build and all contract tests.
2. Independently review contract security and verify the actual USDC and EURC addresses.
3. Test contract integration on Arc Testnet using a funded test wallet.
4. Set `NEXT_PUBLIC_ULTIMA_VAULT_ADDRESS` to the actual Arc Testnet deployment address and redeploy the app.
5. Get explicit user approval before any Mainnet deployment or real-fund transaction.
6. Verify the deployment and sample transaction using the official Arc Explorer.
7. Update this README with only verified deployment details.

## Current limitations

- The two-token `UltimaVault` frontend flow is wired but remains inactive until the compatible contract is deployed with verified USDC and EURC token addresses and `NEXT_PUBLIC_ULTIMA_VAULT_ADDRESS` is configured.
- Circle Earn Kit vault availability and end-to-end deposit/withdraw flows still need funded-wallet verification.
- Activity history currently includes browser-local records for actions made on this device; it is not a complete indexed on-chain history.
- Notification preferences are saved locally and do not yet send email or Telegram notifications.
- Swap availability depends on the live Circle Earn Kit routing and liquidity.
- Strategy analysis requires `GROQ_API_KEY` and is informational, not financial advice.
