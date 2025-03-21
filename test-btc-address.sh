#!/bin/bash

echo "Testing getDirectBTCAddress..."
dfx canister --network ic call 75egi-7qaaa-aaaao-qj6ma-cai getDirectBTCAddress

echo -e "\nCreating a boost request..."
RESULT=$(dfx canister --network ic call 75egi-7qaaa-aaaao-qj6ma-cai registerBoostRequest '(200000, 0.05)')
echo "$RESULT"

# Extract the boost ID from the result
BOOST_ID=$(echo "$RESULT" | grep -o 'id = [0-9]*' | awk '{print $3}')
echo -e "\nExtracted Boost ID: $BOOST_ID"

if [ -n "$BOOST_ID" ]; then
  echo -e "\nGetting BTC address for boost request $BOOST_ID..."
  dfx canister --network ic call 75egi-7qaaa-aaaao-qj6ma-cai getBoostRequestBTCAddress "($BOOST_ID)"
fi

echo -e "\nGetting all boost requests..."
dfx canister --network ic call 75egi-7qaaa-aaaao-qj6ma-cai getAllBoostRequests

echo -e "\nChecking logs..."
dfx canister --network ic logs 75egi-7qaaa-aaaao-qj6ma-cai 