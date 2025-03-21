
# ckBoost: Accelerating Bitcoin Transactions on Internet Computer

 
<div  align="center">

<p><strong>Fast Bitcoin to ckBTC conversion for the Internet Computer ecosystem</strong></p>

</div>

  

## 🚀 Overview

  

ckBoost is platform built on the Internet Computer Protocol (ICP) that solves a critical problem of the ecosystem: transaction speed for chain-key wrapping. By creating a liquidity pool system for ckBTC (chain-key Bitcoin, the Bitcoin twin on Internet Computer), ckBoost enables near-instant Bitcoin transactions, reducing confirmation times from 2 hours to just 15 minutes.
  

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


## 🛠️ Tech Stack

-  **Backend**: [Motoko](https://internetcomputer.org/docs/current/motoko/main/motoko) on the [Internet Computer](https://internetcomputer.org/)

-  **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS 4](https://tailwindcss.com/)

-  **Blockchain Integration**: [ckBTC](https://internetcomputer.org/docs/current/developer-docs/integrations/bitcoin/ckbtc) (chain-key Bitcoin)

-  **Authentication**: Internet Identity, NFID

-  **Build Tools**: [Vite](https://vitejs.dev/), [DFX](https://internetcomputer.org/docs/current/developer-docs/build/install-upgrade-remove)

  

## 🏗️ Architecture

ckBoost leverages the Internet Computer Protocol and its chain-key technology to create a secure bridge between Bitcoin and ICP. The platform consists of:

  

1.  **Canister**: Written in Motoko, these handle the core logic of the platform, including pool creation, deposit management, and transaction boosting.

2.  **ckBTC Integration**: Utilizes the ckBTC minter to facilitate the conversion between Bitcoin and ckBTC.

3.  **Modern Frontend**: Built with React, TypeScript, and Tailwind CSS, providing a responsive and intuitive user interface.

4.  **Secure Authentication**: Integrated with Internet Identity and NFID for secure user authentication.


## 🚀 Getting Started

  

### Prerequisites


- [Node.js](https://nodejs.org/) (v18 or higher)

- [DFX](https://internetcomputer.org/docs/current/developer-docs/build/install-upgrade-remove) (Internet Computer SDK)

- [IC Wallet](https://nns.ic0.app/) with some ICP for canister deployment (for production)

  

### Installation

  

1. Clone the repository:

```bash

git clone https://github.com/LevanIlashvili/ckboost-canister

cd ckboost-canister

```

  

2. Install dependencies:

```bash

npm install

```

  

3. Set up environment variables:

```bash

cp .env.example .env

```

Edit the `.env` file with your configuration.

  

### Development

  

1. Start a local Internet Computer replica:

```bash

dfx start --background

```

  

2. Deploy the canisters to the local replica:

```bash

npm run deploy:local

```

  

3. Start the development server:

```bash

npm run dev

```

  

4. Open your browser and navigate to `http://localhost:5173`

  

### Production Deployment

  

1. Deploy to the Internet Computer mainnet:

```bash

npm run deploy:ic

```

  

## 🌐 Live Demo

Visit our live demo at [72fa4-siaaa-aaaao-qj6mq-cai.icp0.io](https://72fa4-siaaa-aaaao-qj6mq-cai.icp0.io/)


---

<div  align="center">

Built with ❤️ on the Internet Computer, during [BUIDL Battle](https://dorahacks.io/hackathon/buidlbattle/buidl) hackathon

</div>
