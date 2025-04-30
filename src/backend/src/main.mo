import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Float "mo:base/Float";
import Buffer "mo:base/Buffer";
import Blob "mo:base/Blob";

import Types "./types";
import Utils "./utils";
import StateModule "./state";
import BtcUtils "./btc_utils";
import BoostRequestModule "./boost_request";

actor class Main() {
  // Store canister ID as Principal type instead of Text for better type safety
  private let CANISTER_PRINCIPAL = Principal.fromText("75egi-7qaaa-aaaao-qj6ma-cai");
  private let CKBTC_LEDGER_CANISTER_ID = Principal.fromText("mc6ru-gyaaa-aaaar-qaaaq-cai");

  // Centralize ICRC-1 related definitions to avoid duplication
  module LedgerDefs {
    public type Account = { owner : Principal; subaccount : ?Blob };
    public type Tokens = Nat;
    public type TransferError = {
      #GenericError : { message : Text; error_code : Nat };
      #TemporarilyUnavailable;
      #BadBurn : { min_burn_amount : Tokens };
      #Duplicate : { duplicate_of : Nat };
      #BadFee : { expected_fee : Tokens };
      #CreatedInFuture : { ledger_time : Nat64 };
      #TooOld;
      #InsufficientFunds : { balance : Tokens };
    };
    public type TransferArgs = {
      to : Account;
      fee : ?Tokens;
      memo : ?Blob;
      from_subaccount : ?Blob;
      created_at_time : ?Nat64;
      amount : Tokens;
    };
    public type TransferResult = Result.Result<Nat, TransferError>;

    public type Ledger = actor {
      icrc1_transfer : shared TransferArgs -> async TransferResult;
      icrc1_balance_of : shared query Account -> async Tokens;
    };

    public func transferErrorToText(err : TransferError) : Text {
      switch (err) {
        case (#GenericError(r)) "Generic Error: " # r.message;
        case (#TemporarilyUnavailable) "Temporarily Unavailable";
        case (#BadBurn(r)) "Bad Burn: Minimum burn amount is " # Nat.toText(r.min_burn_amount);
        case (#Duplicate(r)) "Duplicate transfer of transaction " # Nat.toText(r.duplicate_of);
        case (#BadFee(r)) "Bad Fee: Expected fee is " # Nat.toText(r.expected_fee);
        case (#CreatedInFuture(_)) "Created in Future";
        case (#TooOld) "Too Old";
        case (#InsufficientFunds(r)) "Insufficient Funds: Balance is " # Nat.toText(r.balance);
      };
    };
    
    // Standard fee for ckBTC transfers - centralized as a constant
    public let STANDARD_FEE : Nat = 10;
  };

  // Initialize state and managers
  let state = StateModule.State();
  private let boostRequestManager = BoostRequestModule.BoostRequestManager(state);
  
  // Helper function to get the ledger actor
  private func getLedger() : LedgerDefs.Ledger {
    actor(Principal.toText(CKBTC_LEDGER_CANISTER_ID)) : LedgerDefs.Ledger;
  };
  
  // Helper to validate amount parameters
  private func validateAmount(amount: Types.Amount, fieldName: Text) : Result.Result<(), Text> {
    if (amount == 0) {
      return #err(fieldName # " must be greater than zero");
    };
    #ok();
  };

  private func validateMaxFeePercentage(maxFeePercentage: Float) : Result.Result<(), Text> {
    if (maxFeePercentage < 0 or maxFeePercentage > 100) {
      return #err("Max fee percentage must be between 0 and 100");
    };
    #ok();
  };
  
  // Helper to validate fee percentage
  private func validateFeePercentage(fee: Float) : Result.Result<(), Text> {
    if (fee < 0 or fee > 100) {
      return #err("Fee percentage must be between 0 and 100");
    };
    #ok();
  };
  
  // System functions for stable storage
  system func preupgrade() {
    // Implementation of state preservation logic here
  };
  
  system func postupgrade() {
    // Implementation of state restoration logic here
  };

  public shared(msg) func registerBoostRequest(
    amount: Types.Amount, 
    fee: Types.Fee, 
    maxFeePercentage: Float, 
    confirmationsRequired: Nat, 
    preferredBooster: ?Principal
  ) : async Result.Result<Types.BoostRequest, Text> {
    // Input validation
    switch(validateAmount(amount, "Amount")) {
      case (#err(e)) return #err(e);
      case _ {};
    };
    
    switch(validateMaxFeePercentage(maxFeePercentage)) {
      case (#err(e)) return #err(e);
      case _ {};
    };
    
    switch(validateFeePercentage(maxFeePercentage)) {
      case (#err(e)) return #err(e);
      case _ {};
    };
    
    if (confirmationsRequired == 0) {
      return #err("Confirmations required must be greater than zero");
    };
    
    await boostRequestManager.registerBoostRequest(
      msg.caller, 
      amount, 
      fee, 
      maxFeePercentage, 
      confirmationsRequired, 
      preferredBooster
    );
  };
  
  public func checkBTCDeposit(boostId: Types.BoostId) : async Result.Result<Types.BoostRequest, Text> {
    await boostRequestManager.checkBTCDeposit(boostId);
  };
  
  public func getBoostRequestBTCAddress(boostId: Types.BoostId) : async Result.Result<Text, Text> {
    switch (state.boostRequests.get(boostId)) {
      case (null) {
        return #err("Boost request not found");
      };
      case _ {
        await boostRequestManager.getBoostRequestBTCAddress(boostId);
      };
    };
  };
  
  public func updateReceivedBTC(boostId: Types.BoostId, receivedAmount: Types.Amount) : async Result.Result<Types.BoostRequest, Text> {
    // Input validation
    switch(validateAmount(receivedAmount, "Received amount")) {
      case (#err(e)) return #err(e);
      case _ {};
    };
    
    // Verify boost request exists
    switch (state.boostRequests.get(boostId)) {
      case (null) {
        return #err("Boost request not found");
      };
      case _ {
        await boostRequestManager.updateReceivedBTC(boostId, receivedAmount);
      };
    };
  };
  
  public query func getBoostRequest(id: Types.BoostId) : async ?Types.BoostRequest {
    boostRequestManager.getBoostRequest(id);
  };
  
  public query func getUserBoostRequests(user: Principal) : async [Types.BoostRequest] {
    boostRequestManager.getUserBoostRequests(user);
  };
  
  public query func getAllBoostRequests() : async [Types.BoostRequest] {
    boostRequestManager.getAllBoostRequests();
  };

  // Booster Account Functions
  public shared(msg) func registerBoosterAccount() : async Result.Result<Types.BoosterAccount, Text> {
    let booster = msg.caller;
    
    // Check if booster already has an account
    switch (state.boosterAccounts.get(booster)) {
      case (?_) {
        return #err("Booster account already exists");
      };
      case (null) {
        let now = Time.now();
        let subaccount = Utils.generateBoosterSubaccount(booster);
        
        let boosterAccount : Types.BoosterAccount = {
          owner = booster;
          subaccount = subaccount;
          totalDeposited = 0;
          availableBalance = 0;
          createdAt = now;
          updatedAt = now;
        };
        
        state.boosterAccounts.put(booster, boosterAccount);
        return #ok(boosterAccount);
      };
    };
  };
  
  // Helper function to fetch account balance
  private func getAccountBalance(owner: Principal, subaccount: Blob) : async Result.Result<Nat, Text> {
    try {
      let ledger = getLedger();
      let balanceArgs : LedgerDefs.Account = {
        owner = owner;
        subaccount = ?subaccount;
      };
      let balance = await ledger.icrc1_balance_of(balanceArgs);
      #ok(balance);
    } catch (e) {
      #err("Failed to fetch current balance from ckBTC ledger: " # Error.message(e));
    };
  };
  
  // Update booster account deposit amount
  public func updateBoosterDeposit(booster: Principal, amount: Types.Amount) : async Result.Result<Types.BoosterAccount, Text> {
    // Input validation
    switch(validateAmount(amount, "Deposit amount")) {
      case (#err(e)) return #err(e);
      case _ {};
    };
    
    switch (state.boosterAccounts.get(booster)) {
      case (null) {
        return #err("Booster account not found");
      };
      case (?account) {
        // Get current balance
        let balanceResult = await getAccountBalance(CANISTER_PRINCIPAL, account.subaccount);
        
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
  
  // Get booster account information
  public query func getBoosterAccount(booster: Principal) : async ?Types.BoosterAccount {
    state.boosterAccounts.get(booster);
  };
  
  // Get all booster accounts
  public query func getAllBoosterAccounts() : async [Types.BoosterAccount] {
    Iter.toArray(Iter.map<(Principal, Types.BoosterAccount), Types.BoosterAccount>(
      state.boosterAccounts.entries(), 
      func ((_, v)) { v }
    ));
  };
  
  // Execute a boost - complete implementation
  public shared(msg) func executeBoost(boostId: Types.BoostId) : async Result.Result<Types.BoostRequest, Text> {
    let booster = msg.caller;
    
    // Check if booster has an account
    switch (state.boosterAccounts.get(booster)) {
      case (null) {
        return #err("Booster account not found");
      };
      case (?boosterAccount) {
        // Check if boost request exists
        switch (state.boostRequests.get(boostId)) {
          case (null) {
            return #err("Boost request not found");
          };
          case (?request) {
            // Check if request is pending and has received BTC
            if (request.status != #pending) {
              return #err("Boost request is not in pending status");
            };
            
            if (request.receivedBTC == 0) {
              return #err("No BTC received for this boost request");
            };
            
            // Check if the fee is acceptable
            if (request.fee > request.maxFeePercentage) {
              return #err("Fee exceeds maximum allowed by the request");
            };
            
            // Check if booster has enough balance
            if (boosterAccount.availableBalance < request.amount) {
              return #err("Insufficient balance to execute this boost");
            };
            
            // Implement ckBTC transfer logic here
            try {
              let ledger = getLedger();
              
              // Prepare the transfer arguments
              let transferArgs : LedgerDefs.TransferArgs = {
                from_subaccount = ?boosterAccount.subaccount;
                to = {
                  owner = request.owner;
                  subaccount = null;
                };
                amount = request.amount;
                fee = ?LedgerDefs.STANDARD_FEE;
                memo = null;
                created_at_time = null;
              };
              
              // Execute the transfer
              let transferResult = await ledger.icrc1_transfer(transferArgs);
              
              switch (transferResult) {
                case (#ok(blockIndex)) {
                  Debug.print("Transfer successful for boost ID " # Nat.toText(boostId) # " at block: " # Nat.toText(blockIndex));
                  
                  // Update booster account
                  let updatedBoosterAccount : Types.BoosterAccount = {
                    owner = boosterAccount.owner;
                    subaccount = boosterAccount.subaccount;
                    totalDeposited = boosterAccount.totalDeposited;
                    availableBalance = boosterAccount.availableBalance - request.amount;
                    createdAt = boosterAccount.createdAt;
                    updatedAt = Time.now();
                  };
                  
                  state.boosterAccounts.put(booster, updatedBoosterAccount);
                  
                  // Update boost request
                  let updatedRequest : Types.BoostRequest = {
                    id = request.id;
                    owner = request.owner;
                    amount = request.amount;
                    fee = request.fee;
                    receivedBTC = request.receivedBTC;
                    btcAddress = request.btcAddress;
                    subaccount = request.subaccount;
                    status = #completed;
                    booster = ?booster;
                    preferredBooster = request.preferredBooster;
                    createdAt = request.createdAt;
                    updatedAt = Time.now();
                    maxFeePercentage = request.maxFeePercentage;
                    confirmationsRequired = request.confirmationsRequired;
                  };
                  
                  state.boostRequests.put(boostId, updatedRequest);
                  
                  return #ok(updatedRequest);
                };
                case (#err(err)) {
                  let errorMsg = LedgerDefs.transferErrorToText(err);
                  Debug.print("Transfer error for boost ID " # Nat.toText(boostId) # ": " # errorMsg);
                  return #err("Transfer failed: " # errorMsg);
                };
              };
            } catch (error) {
              let errorMsg = Error.message(error);
              Debug.print("Error during boost execution: " # errorMsg);
              return #err("Error transferring funds: " # errorMsg);
            };
          };
        };
      };
    };
  };

  // Withdraw from booster account
  public shared(msg) func withdrawBoosterFunds(amount: Types.Amount) : async Result.Result<Types.BoosterAccount, Text> {
    let booster = msg.caller;
    
    // Input validation
    switch(validateAmount(amount, "Withdrawal amount")) {
      case (#err(e)) return #err(e);
      case _ {};
    };
    
    // Check if booster has an account
    switch (state.boosterAccounts.get(booster)) {
      case (null) {
        return #err("Booster account not found");
      };
      case (?boosterAccount) {
        // Check if booster has enough available balance (accounting for fee)
        if (boosterAccount.availableBalance < amount + LedgerDefs.STANDARD_FEE) {
          return #err("Insufficient available balance for withdrawal (including fee)");
        };
        
        let amountToWithdraw = amount;
        
        // Perform the ckBTC transfer using the ledger canister
        try {
          let ledger = getLedger();
          
          let transferArgs : LedgerDefs.TransferArgs = {
            from_subaccount = ?boosterAccount.subaccount;
            to = { owner = booster; subaccount = null; };
            amount = amountToWithdraw;
            fee = ?LedgerDefs.STANDARD_FEE;
            memo = null;
            created_at_time = null;
          };
          
          Debug.print("Starting withdrawal transfer for " # Principal.toText(booster) # 
                      " amount: " # Nat.toText(amountToWithdraw) # 
                      " (fee: " # Nat.toText(LedgerDefs.STANDARD_FEE) # ")");
          
          let transferResult = await ledger.icrc1_transfer(transferArgs);
          
          switch (transferResult) {
            case (#ok(blockIndex)) {
              Debug.print("Transfer successful, block index: " # Nat.toText(blockIndex));
              
              // Fetch final balance from ledger
              let balanceResult = await getAccountBalance(CANISTER_PRINCIPAL, boosterAccount.subaccount);

              switch(balanceResult) {
                case (#err(balanceFetchError)) {
                  // Withdrawal succeeded, but couldn't confirm final balance.
                  // Return an error, but maybe log the original account state?
                  Debug.print("Withdrawal transfer OK, but failed to fetch final balance: " # balanceFetchError);
                  return #err("Withdrawal transfer succeeded, but failed to fetch updated balance: " # balanceFetchError);
                };
                case (#ok(finalBalance)) {
                  // Update booster account using the fetched final balance
                  let updatedAccount : Types.BoosterAccount = {
                    owner = boosterAccount.owner;
                    subaccount = boosterAccount.subaccount;
                    totalDeposited = boosterAccount.totalDeposited; // Keep totalDeposited same
                    availableBalance = finalBalance; // Use final balance from ledger
                    createdAt = boosterAccount.createdAt;
                    updatedAt = Time.now();
                  };
                  
                  state.boosterAccounts.put(booster, updatedAccount);
                  
                  return #ok(updatedAccount);
                }; 
              }; // End inner switch for balance fetch

            }; // End case #ok(blockIndex)
            case (#err(transferErr)) {
              let errorMsg = LedgerDefs.transferErrorToText(transferErr);
              Debug.print("Transfer error: " # errorMsg);
              return #err("Transfer failed: " # errorMsg);
            };
          }; // End outer switch for transfer result
        } catch (error) {
          let errorMsg = Error.message(error);
          Debug.print("Error during withdrawal: " # errorMsg);
          return #err("Error transferring funds: " # errorMsg);
        }; // End try-catch
      }; // End case (?boosterAccount)
    }; // End outer switch
  };

  // Utility Functions
  public query func getCanisterPrincipal() : async Principal {
    return CANISTER_PRINCIPAL;
  };

  public func getDirectBTCAddress() : async Text {
    await BtcUtils.getDirectBTCAddress();
  };

  public query func getPendingBoostRequests(): async [Types.BoostRequest] {
    let buffer = Buffer.Buffer<Types.BoostRequest>(state.boostRequests.size());
    for (request in state.boostRequests.vals()) {
      if (request.status == #pending) {
          buffer.add(request);
      };
    };
 
    return Buffer.toArray(buffer);
  };

  // Complete implementation for a booster to accept/execute a boost request
  public shared(msg) func acceptBoostRequest(boostId: Types.BoostId): async Result.Result<Types.BoostRequest, Text> {
    let caller = msg.caller;
    let now = Time.now();

    // 1. Get Booster Account
    switch (state.boosterAccounts.get(caller)) {
      case (null) {
        return #err("Caller is not a registered booster.");
      };
      case (?boosterAccount) {
        // 2. Get Boost Request
        switch (state.boostRequests.get(boostId)) {
          case (null) {
            return #err("Boost request not found.");
          };
          case (?boostRequest) {
            // 3. Validate Request Status
            if (boostRequest.status != #pending) {
              return #err("Boost request is not in pending status.");
            };
            
            if (boostRequest.booster != null) {
              return #err("Boost request has already been accepted.");
            };
            
            // 4. Check if there's a preferred booster specified
            switch (boostRequest.preferredBooster) {
              case (?preferred) {
                if (preferred != caller) {
                  return #err("This boost request is reserved for a specific booster.");
                };
              };
              case (null) {};
            };
            
            // 5. Check Booster Balance
            let requiredAmount = boostRequest.amount;
            if (boosterAccount.availableBalance < requiredAmount) {
                return #err("Insufficient available balance in booster account.");
            };
            
            // 6. Implement ckBTC transfer to the requester
            try {
              let ledger = getLedger();
              
              // Prepare the transfer arguments
              let transferArgs : LedgerDefs.TransferArgs = {
                from_subaccount = ?boosterAccount.subaccount;
                to = {
                  owner = boostRequest.owner;
                  subaccount = null;
                };
                amount = requiredAmount;
                fee = ?LedgerDefs.STANDARD_FEE;
                memo = null;
                created_at_time = null;
              };
              
              // Execute the transfer
              let transferResult = await ledger.icrc1_transfer(transferArgs);
              
              switch (transferResult) {
                case (#ok(blockIndex)) {
                  Debug.print("Boost transfer successful for boost ID " # Nat.toText(boostId) # " at block: " # Nat.toText(blockIndex));
                  
                  // 7. Update booster account
                  let updatedBoosterAccount : Types.BoosterAccount = {
                    owner = boosterAccount.owner;
                    subaccount = boosterAccount.subaccount;
                    totalDeposited = boosterAccount.totalDeposited;
                    availableBalance = boosterAccount.availableBalance - requiredAmount - LedgerDefs.STANDARD_FEE;
                    createdAt = boosterAccount.createdAt;
                    updatedAt = now;
                  };
                  
                  state.boosterAccounts.put(caller, updatedBoosterAccount);
                  
                  // 8. Update boost request status
                  let updatedBoostRequest : Types.BoostRequest = {
                    id = boostRequest.id;
                    owner = boostRequest.owner;
                    amount = boostRequest.amount;
                    fee = boostRequest.fee;
                    receivedBTC = boostRequest.receivedBTC;
                    btcAddress = boostRequest.btcAddress;
                    subaccount = boostRequest.subaccount;
                    status = #completed;
                    booster = ?caller;
                    preferredBooster = boostRequest.preferredBooster;
                    createdAt = boostRequest.createdAt;
                    updatedAt = now;
                    maxFeePercentage = boostRequest.maxFeePercentage;
                    confirmationsRequired = boostRequest.confirmationsRequired;
                  };
                  
                  state.boostRequests.put(boostId, updatedBoostRequest);
                  
                  return #ok(updatedBoostRequest);
                };
                case (#err(err)) {
                  let errorMsg = LedgerDefs.transferErrorToText(err);
                  Debug.print("Transfer error for boost ID " # Nat.toText(boostId) # ": " # errorMsg);
                  return #err("Transfer failed: " # errorMsg);
                };
              };
            } catch (error) {
              let errorMsg = Error.message(error);
              Debug.print("Error during boost acceptance: " # errorMsg);
              return #err("Error transferring funds: " # errorMsg);
            };
          };
        };
      };
    };
  };
}