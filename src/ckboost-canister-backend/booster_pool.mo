import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";
import HashMap "mo:base/HashMap";
import Int "mo:base/Int";
import Float "mo:base/Float";

import Types "./types";
import Utils "./utils";
import StateModule "./state";

module {
  // Interface for ckBTC ledger
  type Account = {
    owner: Principal;
    subaccount: ?[Nat8];
  };

  type AllowanceArgs = {
    account: Account;
    spender: Account;
  };

  type Allowance = {
    allowance: Nat;
    expires_at: ?Nat64;
  };

  type TransferFromArgs = {
    to: Account;
    fee: ?Nat;
    spender_subaccount: ?[Nat8];
    from: Account;
    memo: ?[Nat8];
    created_at_time: ?Nat64;
    amount: Nat;
  };

  type TransferError = {
    #GenericError: { message: Text; error_code: Nat };
    #TemporarilyUnavailable;
    #InsufficientAllowance: { allowance: Nat };
    #BadBurn: { min_burn_amount: Nat };
    #Duplicate: { duplicate_of: Nat };
    #BadFee: { expected_fee: Nat };
    #CreatedInFuture: { ledger_time: Nat64 };
    #TooOld;
    #InsufficientFunds: { balance: Nat };
  };

  type ICRCTokenInterface = actor {
    icrc2_allowance: shared query AllowanceArgs -> async Allowance;
    icrc2_transfer_from: shared TransferFromArgs -> async { #Ok: Nat; #Err: TransferError };
  };

  let CKBTC_LEDGER_CANISTER_ID = "mqygn-kiaaa-aaaar-qaadq-cai";
  let ckBTCLedger : ICRCTokenInterface = actor(CKBTC_LEDGER_CANISTER_ID);

  public class BoosterPoolManager(state: StateModule.State) {
    private var liquidityProviders = HashMap.HashMap<Principal, Types.LiquidityProvider>(0, Principal.equal, Principal.hash);

    public func registerPool(fee: Types.Fee) : async Result.Result<Types.BoosterPool, Text> {
      if (fee < 0.0 or fee > 100.0) {
        return #err("Fee must be between 0% and 100%");
      };
      
      let poolId = state.getNextBoosterPoolId();
      let adminPrincipal = Principal.fromText(Types.POOL_ADMIN_PRINCIPAL);
      let now = Time.now();
      
      let boosterPool : Types.BoosterPool = {
        id = poolId;
        owner = adminPrincipal;
        fee = fee;
        createdAt = now;
        updatedAt = now;
      };
      
      state.boosterPools.put(poolId, boosterPool);
      #ok(boosterPool)
    };

    public func addLiquidity(canisterPrincipal: Principal, caller: Principal, args: Types.AddLiquidityArgs) : async Result.Result<Types.LiquidityProvider, Text> {
      switch (state.boosterPools.get(args.poolId)) {
        case (null) return #err("Pool not found");
        case (?pool) {
          // Check if caller has approved enough ckBTC
          let allowanceArgs : AllowanceArgs = {
            account = {
              owner = caller;
              subaccount = null;
            };
            spender = {
              owner = canisterPrincipal;
              subaccount = null;
            };
          };

          let allowanceResponse = await ckBTCLedger.icrc2_allowance(allowanceArgs);
          
          // Convert amount to ckBTC units (satoshis)
          // 1 ckBTC = 100000000 satoshis (10^8)
          let satoshiAmount = Int.abs(Float.toInt(args.amount * 100000000.0));
          
          if (allowanceResponse.allowance < satoshiAmount) {
            return #err("Insufficient allowance. Please approve ckBTC first");
          };

          // Transfer ckBTC from provider to pool
          let transferArgs : TransferFromArgs = {
            from = {
              owner = caller;
              subaccount = null;
            };
            to = {
              owner = Principal.fromText(Types.POOL_ADMIN_PRINCIPAL);
              subaccount = null;
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
                case (#GenericError(e)) e.message;
                case (#BadFee(_)) "Invalid fee";
                case (#TemporarilyUnavailable) "Service temporarily unavailable";
                case (_) "Transfer failed";
              };
              return #err(errorMsg);
            };
            case (#Ok(_)) {
              let now = Time.now();
              let provider : Types.LiquidityProvider = {
                poolId = args.poolId;
                provider = caller;
                amount = args.amount;
                createdAt = now;
                updatedAt = now;
              };

              liquidityProviders.put(caller, provider);
              #ok(provider)
            };
          };
        };
      };
    };

    public func getLiquidityProvider(provider: Principal) : ?Types.LiquidityProvider {
      liquidityProviders.get(provider)
    };

    public func getAllPools() : [Types.BoosterPool] {
      Iter.toArray(state.boosterPools.vals())
    };

    public func getAllLiquidityProviders() : [Types.LiquidityProvider] {
      Iter.toArray(liquidityProviders.vals())
    };
  };
} 