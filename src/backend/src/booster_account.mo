import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";

import Types "./types";
import Utils "./utils";
import StateModule "./state";
import Ledger "./ledger";
import Validation "./validation";

module {
  public class BoosterAccountManager(
    state: StateModule.State,
    ledgerOps: Ledger.LedgerOperations,
    canisterPrincipal: Principal
  ) {
    
    // Register a new booster account
    public func registerBoosterAccount(caller: Principal) : Result.Result<Types.BoosterAccount, Text> {
      // Check if booster already has an account
      switch (state.boosterAccounts.get(caller)) {
        case (?_) {
          return #err("Booster account already exists");
        };
        case (null) {
          let now = Time.now();
          let subaccount = Utils.generateBoosterSubaccount(caller);
          
          let boosterAccount : Types.BoosterAccount = {
            owner = caller;
            subaccount = subaccount;
            totalDeposited = 0;
            availableBalance = 0;
            createdAt = now;
            updatedAt = now;
          };
          
          state.boosterAccounts.put(caller, boosterAccount);
          return #ok(boosterAccount);
        };
      };
    };

    // Update booster account deposit amount
    public func updateBoosterDeposit(booster: Principal, amount: Types.Amount) : async Result.Result<Types.BoosterAccount, Text> {
      // Input validation
      switch(Validation.validateAmount(amount, "Deposit amount")) {
        case (#err(e)) return #err(e);
        case _ {};
      };
      
      switch (state.boosterAccounts.get(booster)) {
        case (null) {
          return #err("Booster account not found");
        };
        case (?account) {
          // Get current balance
          let balanceResult = await ledgerOps.getAccountBalance(canisterPrincipal, account.subaccount);
          
          switch (balanceResult) {
            case (#err(e)) {
              return #err(e);
            };
            case (#ok(currentBalance)) {
              let updatedAccount : Types.BoosterAccount = {
                owner = account.owner;
                subaccount = account.subaccount;
                totalDeposited = account.totalDeposited + amount;
                availableBalance = currentBalance;
                createdAt = account.createdAt;
                updatedAt = Time.now();
              };
              
              state.boosterAccounts.put(booster, updatedAccount);
              return #ok(updatedAccount);
            };
          };
        };
      };
    };

    // Withdraw funds from booster account
    public func withdrawBoosterFunds(caller: Principal, amount: Types.Amount) : async Text {
      // Input validation
      switch(Validation.validateAmount(amount, "Withdrawal amount")) {
        case (#err(e)) return "ERROR - " # e;
        case _ {};
      };
      
      // Check if booster has an account
      switch (state.boosterAccounts.get(caller)) {
        case (null) {
          return "ERROR - Booster account not found";
        };
        case (?boosterAccount) {
          // Check if booster has enough available balance (accounting for fee)
          if (boosterAccount.availableBalance < amount + Ledger.STANDARD_FEE) {
            return "ERROR - Insufficient available balance for withdrawal (including fee)";
          };
          
          let transferArgs : Ledger.TransferArgs = {
            from_subaccount = ?boosterAccount.subaccount;
            to = { owner = caller; subaccount = null; };
            amount = amount;
            fee = ?Ledger.STANDARD_FEE;
            memo = null;
            created_at_time = null;
          };
          
          let transferResult = await ledgerOps.transferWithLogging(transferArgs, "Withdrawal");
          
          switch (transferResult) {
            case (#ok(_blockIndex)) {
              // Fetch final balance from ledger
              let balanceResult = await ledgerOps.getAccountBalance(canisterPrincipal, boosterAccount.subaccount);

              switch(balanceResult) {
                case (#err(balanceFetchError)) {
                  Debug.print("Withdrawal transfer OK, but failed to fetch final balance: " # balanceFetchError);
                  return "ERROR - Withdrawal transfer succeeded, but failed to fetch updated balance: " # balanceFetchError;
                };
                case (#ok(finalBalance)) {
                  // Update booster account using the fetched final balance
                  let updatedAccount : Types.BoosterAccount = {
                    owner = boosterAccount.owner;
                    subaccount = boosterAccount.subaccount;
                    totalDeposited = boosterAccount.totalDeposited;
                    availableBalance = finalBalance;
                    createdAt = boosterAccount.createdAt;
                    updatedAt = Time.now();
                  };
                  
                  state.boosterAccounts.put(caller, updatedAccount);
                  return "OK - Withdrawal Successful";
                }; 
              };
            };
            case (#err(errorMsg)) {
              return "ERROR - Transfer Failed: " # errorMsg;
            };
          };
        };
      };
    };

    // Query functions
    public func getBoosterAccount(booster: Principal) : ?Types.BoosterAccount {
      state.boosterAccounts.get(booster);
    };
    
    public func getAllBoosterAccounts() : [Types.BoosterAccount] {
      Iter.toArray(Iter.map<(Principal, Types.BoosterAccount), Types.BoosterAccount>(
        state.boosterAccounts.entries(), 
        func ((_, v)) { v }
      ));
    };
  };
}