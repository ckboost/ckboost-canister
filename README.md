
# ckBoost Protocol: Accelerating Bitcoin to ckBTC Transactions

<div align="center">

<p><strong>A decentralized protocol for instant Bitcoin liquidity on the Internet Computer</strong></p>

[![Internet Computer](https://img.shields.io/badge/Internet_Computer-Protocol-blue)](https://internetcomputer.org/)
[![ckBTC](https://img.shields.io/badge/ckBTC-Integration-orange)](https://internetcomputer.org/docs/current/developer-docs/integrations/bitcoin/ckbtc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Documentation](https://img.shields.io/badge/Documentation-docs.ckboost.com-green)](https://docs.ckboost.com/)

</div>

## 🚀 Protocol Overview

ckBoost is a **decentralized backend protocol** built on the Internet Computer that solves the critical problem of slow Bitcoin to ckBTC conversion times. By creating a liquidity pool marketplace, ckBoost enables instant Bitcoin transactions, reducing confirmation times from **2 hours to ~15 minutes**.

**This is a protocol-only implementation** - no frontend included. It's designed to be integrated by wallets, dApps, and other applications that need fast Bitcoin bridging.
  

## 🔍 The Problem

ckBTC wrapping transactions are secure but slow. The standard confirmation time for minting ckBTC is approximately 2 hours, which creates significant friction for users who need faster access to their funds. This limitation is a major obstacle to ckBTC adoption for everyday transactions.

## 💡 Our Solution
ckBoost introduces a novel approach to this problem through a two-sided marketplace:

1.  **Liquidity Providers**: Users can create booster pools by depositing ckBTC and setting a fee percentage. These pools provide the liquidity needed to "boost" transactions.

2.  **Users**: People who need faster access to their ckBTC can use these liquidity pools to receive their funds in approximately 15 minutes instead of waiting for 2 hours, paying a small fee to the liquidity providers.

  

## ✨ Key Features  

### For Liquidity Providers:

- Create customizable booster pools with adjustable fee percentages (0.1% to 2%)
- Earn passive income by collecting fees when your pool is used for boosting transactions
- Monitor real-time pool balances and total boosted amounts
- Withdraw liquidity at any time (when not actively being used for boosting)

 
### For Users:

- Receive ckBTC in approximately 15 minutes instead of 2 hours
- Transparent fee system with no hidden costs
- Seamless user experience with real-time transaction tracking


## 🛠️ Protocol Stack

- **Smart Contracts**: [Motoko](https://internetcomputer.org/docs/current/motoko/main/motoko) on the [Internet Computer](https://internetcomputer.org/)
- **Blockchain Integration**: [ckBTC](https://internetcomputer.org/docs/current/developer-docs/integrations/bitcoin/ckbtc) (chain-key Bitcoin) 
- **Standards**: ICRC-1 for token transfers
- **Build Tools**: [DFX](https://internetcomputer.org/docs/current/developer-docs/build/install-upgrade-remove) (Internet Computer SDK)

  

## 🏗️ Protocol Architecture

ckBoost leverages the Internet Computer Protocol and its chain-key technology to create a trustless bridge between Bitcoin and ckBTC. The protocol consists of:

1. **Core Canister**: Written in Motoko, handles all protocol logic including liquidity pools, boost execution, and fund management.

2. **ckBTC Integration**: Direct integration with the ckBTC minter for Bitcoin monitoring and ckBTC minting.

3. **Modular Design**: Clean separation of concerns with dedicated modules for ledger operations, validation, and minting workflows.

4. **ICRC-1 Compliance**: Standard token operations for seamless integration with wallets and other protocols.


## 🚀 Protocol Deployment

### Prerequisites

- [DFX](https://internetcomputer.org/docs/current/developer-docs/build/install-upgrade-remove) (Internet Computer SDK)
- [IC Wallet](https://nns.ic0.app/) with ICP for canister deployment (for mainnet)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/ckboost/ckboost-canister
cd ckboost-canister
```

2. Install dependencies:
```bash
npm install
```

3. Start local Internet Computer replica:
```bash
npm run start
```

4. Deploy the protocol locally:
```bash
npm run deploy:local
```

5. Generate type declarations:
```bash
npm run generate
```

### Mainnet Deployment

Deploy to Internet Computer mainnet:
```bash
npm run deploy:ic
```

## 📚 Protocol Integration

### Canister Interface

The ckBoost protocol exposes a comprehensive API for integration. Key functions include:

- `registerBoostRequest()` - Create new boost requests
- `acceptBoostRequest()` - Provide instant liquidity
- `registerBoosterAccount()` - Become a liquidity provider
- `triggerMintingForMyBoostRequest()` - Fallback minting for users
- `reclaimMintedFunds()` - Reclaim funds after minting

### Integration Examples

**JavaScript/TypeScript Integration:**
```javascript
import { Actor } from "@dfinity/agent";
import { idlFactory } from "./declarations/backend";

const ckBoostActor = Actor.createActor(idlFactory, {
  agent: your_agent,
  canisterId: "your_canister_id"
});

// Create a boost request
const result = await ckBoostActor.registerBoostRequest(
  amount_in_satoshis,
  max_fee_percentage,
  confirmations_required,
  preferred_booster
);
```

**Complete Documentation:** Visit [docs.ckboost.com](https://docs.ckboost.com/) for comprehensive integration guides, API reference, and protocol documentation.


---

<div  align="center">

Built with ❤️ on the Internet Computer, during [BUIDL Battle](https://dorahacks.io/hackathon/buidlbattle/buidl) hackathon

</div>
