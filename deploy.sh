#!/bin/bash

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting deployment to Internet Computer mainnet...${NC}"


# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo -e "${RED}dfx is not installed. Please install it first.${NC}"
    echo "Run: sh -ci \"\$(curl -fsSL https://internetcomputer.org/install.sh)\""
    exit 1
fi

# Check dfx version
DFX_VERSION=$(dfx --version | cut -d' ' -f2)
echo -e "${GREEN}Using dfx version: ${DFX_VERSION}${NC}"

# Build the project
echo -e "${YELLOW}Building the project...${NC}"
npm run build

# Check current balance 
BALANCE=$(dfx ledger --network ic balance)
echo -e "${GREEN}Current balance: ${BALANCE}${NC}"

# Current cycle balance
CYCLE_BALANCE=$(dfx cycles balance --network=ic)
echo -e "${GREEN}Current cycle balance: ${CYCLE_BALANCE}${NC}"

# Deploy to mainnet
echo -e "${YELLOW}Deploying to mainnet...${NC}"
dfx deploy --network ic --with-cycles 900000000000

# Get canister IDs
BACKEND_CANISTER_ID=$(dfx canister --network=ic id backend)
FRONTEND_CANISTER_ID=$(dfx canister --network=ic id frontend)

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Backend canister ID: ${BACKEND_CANISTER_ID}${NC}"
echo -e "${GREEN}Frontend canister ID: ${FRONTEND_CANISTER_ID}${NC}"
echo -e "${GREEN}Frontend URL: https://${FRONTEND_CANISTER_ID}.ic0.app${NC}"

# Update .env.production with the canister IDs
echo -e "${YELLOW}Updating .env.production with canister IDs...${NC}"
sed -i '' "s/VITE_CANISTER_ID_BACKEND=/VITE_CANISTER_ID_BACKEND=${BACKEND_CANISTER_ID}/" .env.production
sed -i '' "s/VITE_CANISTER_ID_FRONTEND=/VITE_CANISTER_ID_FRONTEND=${FRONTEND_CANISTER_ID}/" .env.production

# #update .env 
# sed -i '' "s/VITE_CANISTER_ID_BACKEND=/VITE_CANISTER_ID_BACKEND=${BACKEND_CANISTER_ID}/" .env 
# sed -i '' "s/VITE_CANISTER_ID_FRONTEND=/VITE_CANISTER_ID_FRONTEND=${FRONTEND_CANISTER_ID}/" .env 

echo -e "${GREEN}Deployment process completed!${NC}"
echo -e "${YELLOW}Don't forget to add cycles to your canisters:${NC}"
echo "dfx canister --network ic deposit-cycles 1000000000000 ${BACKEND_CANISTER_ID}"
echo "dfx canister --network ic deposit-cycles 1000000000000 ${FRONTEND_CANISTER_ID}" 