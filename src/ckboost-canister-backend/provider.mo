import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Nat32 "mo:base/Nat32";
import Nat8 "mo:base/Nat8";
import Iter "mo:base/Iter";
import Blob "mo:base/Blob";
import Float "mo:base/Float";
import Error "mo:base/Error";

import Types "./types";
import Subaccount "./subaccount";
import Constants "./constants";
import Utils "./utils";
import State "./state";

module {
    type ICRCTokenInterface = actor {
        icrc2_allowance : shared query { account : { owner : Principal; subaccount : ?[Nat8] }; spender : { owner : Principal; subaccount : ?[Nat8] } } -> async { allowance : Nat; expires_at : ?Nat64 };
        icrc2_transfer_from : shared { from : { owner : Principal; subaccount : ?[Nat8] }; to : { owner : Principal; subaccount : ?[Nat8] }; amount : Nat; fee : ?Nat; memo : ?[Nat8]; created_at_time : ?Nat64; spender_subaccount : ?[Nat8] } -> async { #Ok : Nat; #Err : { #InsufficientAllowance : { allowance : Nat }; #InsufficientFunds : { balance : Nat }; #GenericError : { message : Text; error_code : Nat }; #TemporarilyUnavailable; #BadBurn : { min_burn_amount : Nat }; #Duplicate : { duplicate_of : Nat }; #BadFee : { expected_fee : Nat }; #CreatedInFuture : { ledger_time : Nat64 }; #TooOld } };
    };

    public class ProviderManager(state: State.State) {
        private let ckBTCLedger : ICRCTokenInterface = actor(Constants.CKBTC_LEDGER_CANISTER_ID);
        private var providers = HashMap.HashMap<Principal, Types.LiquidityProvider>(0, Principal.equal, Principal.hash);
        private var subaccountToProvider = HashMap.HashMap<Types.Subaccount, Principal>(0, func(a: [Nat8], b: [Nat8]) : Bool {
            if (a.size() != b.size()) return false;
            for (i in a.keys()) {
                if (a[i] != b[i]) return false;
            };
            true
        }, func(s: [Nat8]) : Nat32 {
            var hash : Nat32 = 0;
            for (byte in s.vals()) {
                hash := hash +% Nat32.fromNat(Nat8.toNat(byte));
            };
            hash
        });

        // Register a new provider
        public func registerProvider(provider: Principal) : Result.Result<Types.LiquidityProvider, Text> {
            switch (providers.get(provider)) {
                case (?_) {
                    #err("Provider already registered")
                };
                case null {
                    let subaccount = Subaccount.generateProviderSubaccount(provider);
                    let now = Time.now();
                    
                    let newProvider : Types.LiquidityProvider = {
                        id = provider;
                        subaccount = subaccount;
                        totalBalance = 0.0;
                        availableBalance = 0.0;
                        lockedBalance = 0.0;
                        totalTransactions = 0;
                        isActive = true;
                        createdAt = now;
                        updatedAt = now;
                    };

                    providers.put(provider, newProvider);
                    subaccountToProvider.put(subaccount, provider);
                    #ok(newProvider)
                };
            }
        };

        // Add liquidity
        public func addLiquidity(provider: Principal, args: Types.AddLiquidityArgs) : async Result.Result<Types.Transaction, Text> {
            switch (providers.get(provider)) {
                case null return #err("Provider not registered");
                case (?providerData) {
                    if (args.amount <= 0.0) {
                        return #err("Amount must be greater than 0");
                    };

                    if (args.amount < Constants.MIN_DEPOSIT_AMOUNT) {
                        return #err("Amount must be at least " # Float.toText(Constants.MIN_DEPOSIT_AMOUNT) # " ckBTC");
                    };

                    let canisterPrincipal = Principal.fromText(Constants.CANISTER_PRINCIPAL);
                    
                    // Check allowance
                    let allowanceArgs = {
                        account = {
                            owner = provider;
                            subaccount = null;
                        };
                        spender = {
                            owner = canisterPrincipal;
                            subaccount = null;
                        };
                    };

                    try {
                        let allowanceResponse = await ckBTCLedger.icrc2_allowance(allowanceArgs);
                        let satoshiAmount = Utils.ckBTCToSatoshis(args.amount);
                        
                        if (allowanceResponse.allowance < satoshiAmount) {
                            return #err("Insufficient allowance. Please approve at least " # Float.toText(args.amount) # " ckBTC");
                        };

                        // Transfer tokens
                        let transferArgs = {
                            from = {
                                owner = provider;
                                subaccount = null;
                            };
                            to = {
                                owner = canisterPrincipal;
                                subaccount = ?providerData.subaccount;
                            };
                            amount = satoshiAmount;
                            fee = null;
                            memo = null;
                            created_at_time = null;
                            spender_subaccount = null;
                        };

                        let transferResult = await ckBTCLedger.icrc2_transfer_from(transferArgs);
                        
                        switch (transferResult) {
                            case (#Err(e)) {
                                let errorMsg = switch(e) {
                                    case (#InsufficientAllowance(_)) "Insufficient allowance";
                                    case (#InsufficientFunds(_)) "Insufficient funds";
                                    case (#GenericError({ message; error_code = _ })) message;
                                    case (#BadFee(_)) "Invalid fee";
                                    case (#TemporarilyUnavailable) "Service temporarily unavailable";
                                    case (_) "Transfer failed";
                                };
                                #err(errorMsg)
                            };
                            case (#Ok(_)) {
                                let now = Time.now();
                                let transaction : Types.Transaction = {
                                    id = state.getNextTransactionId();
                                    provider = provider;
                                    transactionType = #deposit;
                                    amount = args.amount;
                                    fee = null;
                                    boostRequestId = null;
                                    status = #completed;
                                    memo = ?"Liquidity deposit";
                                    createdAt = now;
                                    completedAt = ?now;
                                };

                                // Update provider balances
                                ignore updateProviderBalances(
                                    provider,
                                    providerData.totalBalance + args.amount,
                                    providerData.availableBalance + args.amount,
                                    providerData.lockedBalance
                                );

                                state.addTransaction(transaction);
                                #ok(transaction)
                            };
                        };
                    } catch (e) {
                        #err("Error processing liquidity addition: " # Error.message(e))
                    };
                };
            };
        };

        // Withdraw liquidity
        public func withdrawLiquidity(provider: Principal, args: Types.WithdrawLiquidityArgs) : async Result.Result<Types.Transaction, Text> {
            switch (providers.get(provider)) {
                case null return #err("Provider not registered");
                case (?providerData) {
                    if (args.amount <= 0.0) {
                        return #err("Amount must be greater than 0");
                    };

                    if (args.amount > providerData.availableBalance) {
                        return #err("Insufficient available balance");
                    };

                    let now = Time.now();
                    let transaction : Types.Transaction = {
                        id = state.getNextTransactionId();
                        provider = provider;
                        transactionType = #withdrawal;
                        amount = args.amount;
                        fee = null;
                        boostRequestId = null;
                        status = #pending;
                        memo = ?"Liquidity withdrawal";
                        createdAt = now;
                        completedAt = null;
                    };

                    // Update provider balances
                    ignore updateProviderBalances(
                        provider,
                        providerData.totalBalance - args.amount,
                        providerData.availableBalance - args.amount,
                        providerData.lockedBalance
                    );

                    state.addTransaction(transaction);
                    #ok(transaction)
                };
            };
        };

        // Get provider by principal
        public func getProvider(provider: Principal) : ?Types.LiquidityProvider {
            providers.get(provider)
        };

        // Get provider by subaccount
        public func getProviderBySubaccount(subaccount: Types.Subaccount) : ?Types.LiquidityProvider {
            switch (subaccountToProvider.get(subaccount)) {
                case (?provider) providers.get(provider);
                case null null;
            }
        };

        // Update provider balances
        public func updateProviderBalances(
            provider: Principal,
            totalBalance: Types.Amount,
            availableBalance: Types.Amount,
            lockedBalance: Types.Amount
        ) : Result.Result<Types.LiquidityProvider, Text> {
            switch (providers.get(provider)) {
                case (?existing) {
                    let updated : Types.LiquidityProvider = {
                        id = existing.id;
                        subaccount = existing.subaccount;
                        totalBalance = totalBalance;
                        availableBalance = availableBalance;
                        lockedBalance = lockedBalance;
                        totalTransactions = existing.totalTransactions + 1;
                        isActive = existing.isActive;
                        createdAt = existing.createdAt;
                        updatedAt = Time.now();
                    };
                    providers.put(provider, updated);
                    #ok(updated)
                };
                case null {
                    #err("Provider not found")
                };
            }
        };

        // Get all providers
        public func getAllProviders() : [Types.LiquidityProvider] {
            Iter.toArray(providers.vals())
        };

        // Validate if a provider exists and is active
        public func isActiveProvider(provider: Principal) : Bool {
            switch (providers.get(provider)) {
                case (?p) p.isActive;
                case null false;
            }
        };
    };
}; 