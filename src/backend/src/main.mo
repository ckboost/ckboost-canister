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
      #BadFee : { expected_fee : Tokens };
      #BadBurn : { min_burn_amount : Tokens };
      #InsufficientFunds : { balance : Tokens };
      #TooOld;
      #CreatedInFuture : { ledger_time : Nat64 };
      #TemporarilyUnavailable;
      #Duplicate : { duplicate_of : Nat };
      #GenericError : { error_code : Nat; message : Text };
    };
    public type TransferArgs = {
      from_subaccount : ?Blob;
      to : Account;
      amount : Tokens;
      fee : ?Tokens;
      memo : ?Blob;
      created_at_time : ?Nat64;
    };
    public type ActualTransferResult = { 
      #Ok : Nat; // BlockIndex is Nat
      #Err : TransferError; // This holds the inner TransferError variant
    };

    public type Ledger = actor {
      icrc1_transfer : shared TransferArgs -> async ActualTransferResult;
      icrc1_balance_of : shared query Account -> async Tokens;
    };

    public func transferErrorToText(err : TransferError) : Text {
      switch (err) {
        case (#BadFee(r)) "Bad Fee: Expected fee is " # Nat.toText(r.expected_fee);
        case (#BadBurn(r)) "Bad Burn: Minimum burn amount is " # Nat.toText(r.min_burn_amount);
        case (#InsufficientFunds(r)) "Insufficient Funds: Balance is " # Nat.toText(r.balance);
        case (#TooOld) "Too Old";
        case (#CreatedInFuture(r)) "Created in Future: Ledger time " # Nat64.toText(r.ledger_time);
        case (#TemporarilyUnavailable) "Temporarily Unavailable";
        case (#Duplicate(r)) "Duplicate transfer of transaction " # Nat.toText(r.duplicate_of);
        case (#GenericError(r)) "Generic Error: " # r.message # " (code: " # Nat.toText(r.error_code) # ")";
      };
    };
    
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
  
  public shared(msg) func withdrawBoosterFunds(amount: Types.Amount) : async Text {
    let booster = msg.caller;
    
    // Input validation
    switch(validateAmount(amount, "Withdrawal amount")) {
      case (#err(e)) return "ERROR - " # e;
      case _ {};
    };
    
    // Check if booster has an account
    switch (state.boosterAccounts.get(booster)) {
      case (null) {
        return "ERROR - Booster account not found";
      };
      case (?boosterAccount) {
        // Check if booster has enough available balance (accounting for fee)
        if (boosterAccount.availableBalance < amount + LedgerDefs.STANDARD_FEE) {
          return "ERROR - Insufficient available balance for withdrawal (including fee)";
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
            case (#Ok(blockIndex)) {
              Debug.print("Withdrawal transfer OK (matched #Ok variant).");
              
              // Fetch final balance from ledger
              let balanceResult = await getAccountBalance(CANISTER_PRINCIPAL, boosterAccount.subaccount);

              switch(balanceResult) {
                case (#err(balanceFetchError)) {
                  // Withdrawal succeeded, but couldn't confirm final balance.
                  // Return an error, but maybe log the original account state?
                  Debug.print("Withdrawal transfer OK, but failed to fetch final balance: " # balanceFetchError);
                  return "ERROR - Withdrawal transfer succeeded, but failed to fetch updated balance: " # balanceFetchError;
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
                  
                  return "OK - Withdrawal Successful";
                }; 
              }; // End inner switch for balance fetch

            }; // End case #Ok(blockIndex)
            case (#Err(innerErrorVariant)) {
              let errorMsg = LedgerDefs.transferErrorToText(innerErrorVariant);
              Debug.print("Transfer error: " # errorMsg);
              return "ERROR - Transfer Failed: " # errorMsg;
            };
          }; // End outer switch
        } catch (error) {
          let errorMsg = Error.message(error);
          Debug.print("Error during withdrawal: " # errorMsg);
          return "ERROR - Exception during withdrawal: " # errorMsg;
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
  public shared(msg) func acceptBoostRequest(boostId: Types.BoostId): async Text {
    let caller = msg.caller;
    let now = Time.now();

    // 1. Get Booster Account
    var currentBoosterAccount : Types.BoosterAccount = switch (state.boosterAccounts.get(caller)) {
      case (?account) account;
      case (null) return "ERROR - Caller is not a registered booster.";
    };

    // 2. Get Boost Request
    var currentBoostRequest : Types.BoostRequest = switch (state.boostRequests.get(boostId)) {
      case (?request) request;
      case (null) return "ERROR - Boost request not found.";
    };

    // 3. Validate Request Status
    if (currentBoostRequest.status != #pending) {
      return "ERROR - Boost request is not in pending status.";
    };
    if (currentBoostRequest.booster != null) {
      return "ERROR - Boost request has already been accepted.";
    };
    
    // 4. Check if there's a preferred booster specified
    switch (currentBoostRequest.preferredBooster) {
      case (?preferred) {
        if (preferred != caller) {
          return "ERROR - This boost request is reserved for a specific booster.";
        };
      };
      case (null) {};
    };
    
    // 5. Check Booster Balance
    let requiredAmount = currentBoostRequest.amount;
    if (currentBoosterAccount.availableBalance < requiredAmount + LedgerDefs.STANDARD_FEE) { // Include fee in check
        return "ERROR - Insufficient available balance (incl. fee) in booster account.";
    };
    
    // 6. Implement ckBTC transfer to the requester
    try {
      let ledger = getLedger();
      
      let transferArgs : LedgerDefs.TransferArgs = {
        from_subaccount = ?currentBoosterAccount.subaccount;
        to = {
          owner = currentBoostRequest.owner;
          subaccount = null;
        };
        amount = requiredAmount;
        fee = ?LedgerDefs.STANDARD_FEE;
        memo = null;
        created_at_time = null;
      };
      
      let transferResult = await ledger.icrc1_transfer(transferArgs);
      
      switch (transferResult) {
        case (#Ok(blockIndex)) {
          Debug.print("Boost transfer successful (matched #Ok variant), block: " # Nat.toText(blockIndex));
          
          // 7. Update booster account (Subtract amount + fee)
          let updatedBoosterAccount : Types.BoosterAccount = {
            owner = currentBoosterAccount.owner;
            subaccount = currentBoosterAccount.subaccount;
            totalDeposited = currentBoosterAccount.totalDeposited;
            availableBalance = currentBoosterAccount.availableBalance - requiredAmount - LedgerDefs.STANDARD_FEE; 
            createdAt = currentBoosterAccount.createdAt;
            updatedAt = now;
          };
          
          state.boosterAccounts.put(caller, updatedBoosterAccount);
          
          // 8. Update boost request status
          let updatedBoostRequest : Types.BoostRequest = {
            id = currentBoostRequest.id;
            owner = currentBoostRequest.owner;
            amount = currentBoostRequest.amount;
            receivedBTC = currentBoostRequest.receivedBTC;
            btcAddress = currentBoostRequest.btcAddress;
            subaccount = currentBoostRequest.subaccount;
            status = #completed; // Mark as completed after transfer
            booster = ?caller;
            preferredBooster = currentBoostRequest.preferredBooster;
            createdAt = currentBoostRequest.createdAt;
            updatedAt = now;
            maxFeePercentage = currentBoostRequest.maxFeePercentage;
            confirmationsRequired = currentBoostRequest.confirmationsRequired;
          };
          
          state.boostRequests.put(boostId, updatedBoostRequest);
          
          return "OK - Boost Accepted";
        };
        case (#Err(innerErrorVariant)) {
          let errorMsg = LedgerDefs.transferErrorToText(innerErrorVariant);
          Debug.print("Transfer error for boost ID " # Nat.toText(boostId) # ": " # errorMsg);
          return "ERROR - Transfer Failed: " # errorMsg;
        };
      };
    } catch (error) {
      let errorMsg = Error.message(error);
      Debug.print("Error during boost acceptance: " # errorMsg);
      return "ERROR - Exception during acceptance: " # errorMsg;
    };
  };
}