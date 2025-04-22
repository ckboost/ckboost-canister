import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import HashMap "mo:base/HashMap";
import Text "mo:base/Text";
import Float "mo:base/Float";
import Buffer "mo:base/Buffer";
import Option "mo:base/Option";
import Blob "mo:base/Blob";

import Types "./types";
import Utils "./utils";
import StateModule "./state";
import BtcUtils "./btc_utils";
import BoostRequestModule "./boost_request";

let CKBTC_LEDGER_CANISTER_ID = Principal.fromText("mc6ru-gyaaa-aaaar-qaaaq-cai");

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
};

actor class Main(initBoostId: Nat) {
  let state = StateModule.State(initBoostId);
  
  // Initialize managers
  private let boostRequestManager = BoostRequestModule.BoostRequestManager(state);
  
  // Constants
  private let CANISTER_PRINCIPAL: Text = "75egi-7qaaa-aaaao-qj6ma-cai";
  
  // System functions for stable storage
  system func preupgrade() {
  };
  
  system func postupgrade() {
  };

  public shared(msg) func registerBoostRequest(amount: Types.Amount, fee: Types.Fee, maxFeePercentage: Float, confirmationsRequired: Nat, preferredBooster: ?Principal) : async Result.Result<Types.BoostRequest, Text> {
    await boostRequestManager.registerBoostRequest(msg.caller, amount, fee, maxFeePercentage, confirmationsRequired, preferredBooster);
  };
  
  public func checkBTCDeposit(boostId: Types.BoostId) : async Result.Result<Types.BoostRequest, Text> {
    await boostRequestManager.checkBTCDeposit(boostId);
  };
  
  public func getBoostRequestBTCAddress(boostId: Types.BoostId) : async Result.Result<Text, Text> {
    await boostRequestManager.getBoostRequestBTCAddress(boostId);
  };
  
  public func updateReceivedBTC(boostId: Types.BoostId, receivedAmount: Types.Amount) : async Result.Result<Types.BoostRequest, Text> {
    await boostRequestManager.updateReceivedBTC(boostId, receivedAmount);
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
  
  // Update booster account deposit amount
  public func updateBoosterDeposit(booster: Principal, amount: Types.Amount) : async Result.Result<Types.BoosterAccount, Text> {
    switch (state.boosterAccounts.get(booster)) {
      case (null) {
        return #err("Booster account not found");
      };
      case (?account) {
        let updatedAccount : Types.BoosterAccount = {
          owner = account.owner;
          subaccount = account.subaccount;
          totalDeposited = account.totalDeposited + amount;
          availableBalance = account.availableBalance + amount;
          createdAt = account.createdAt;
          updatedAt = Time.now();
        };
        
        state.boosterAccounts.put(booster, updatedAccount);
        return #ok(updatedAccount);
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
  
  // Execute a boost
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
            
            // TODO: Implement the actual ckBTC transfer logic here
            // For now, we just update the statuses
            
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
        };
      };
    };
  };

  // Withdraw from booster account
  public shared(msg) func withdrawBoosterFunds(amount: Types.Amount) : async Result.Result<Types.BoosterAccount, Text> {
    let booster = msg.caller;
    
    // Check if booster has an account
    switch (state.boosterAccounts.get(booster)) {
      case (null) {
        return #err("Booster account not found");
      };
      case (?boosterAccount) {
        // Standard fee for ckBTC transfers
        let standardFee : Nat = 10;
        
        // Check if booster has enough available balance (accounting for fee)
        if (boosterAccount.availableBalance < amount + standardFee) {
          return #err("Insufficient available balance for withdrawal (including fee)");
        };
        
        // Calculate the actual amount to withdraw (deducting fee)
        let amountToWithdraw = amount;
        
        // Actually transfer the ckBTC using the ledger canister
        try {
          // Interface for ICRC-1 token ledger
          type Account = {
            owner : Principal;
            subaccount : ?Blob;
          };
          
          type TransferArgs = {
            from_subaccount : ?Blob;
            to : Account;
            amount : Nat;
            fee : ?Nat;
            memo : ?Blob;
            created_at_time : ?Nat64;
          };
          
          type TransferResult = {
            #Ok : Nat;
            #Err : {
              #BadFee : { expected_fee : Nat };
              #BadBurn : { min_burn_amount : Nat };
              #InsufficientFunds : { balance : Nat };
              #TooOld;
              #CreatedInFuture : { ledger_time : Nat64 };
              #Duplicate : { duplicate_of : Nat };
              #TemporarilyUnavailable;
              #GenericError : { error_code : Nat; message : Text };
            };
          };
          
          // Interface for the ICRC-1 ledger canister
          type ICRCLedgerInterface = actor {
            icrc1_transfer : shared (TransferArgs) -> async TransferResult;
          };
          
          // ICRC-1 ledger canister ID
          let CKBTC_LEDGER_CANISTER_ID = "mc6ru-gyaaa-aaaar-qaaaq-cai";
          let ckbtcLedger = actor(CKBTC_LEDGER_CANISTER_ID) : ICRCLedgerInterface;
          
          // Prepare the transfer arguments
          let transferArgs : TransferArgs = {
            from_subaccount = ?boosterAccount.subaccount;
            to = {
              owner = booster;
              subaccount = null;
            };
            amount = amountToWithdraw;
            fee = ?standardFee; // Standard fee of 10 e8s for ckBTC
            memo = null;
            created_at_time = null;
          };
          
          Debug.print("Starting withdrawal transfer for " # Principal.toText(booster) # " amount: " # Nat.toText(amountToWithdraw) # " (fee: " # Nat.toText(standardFee) # ")");
          
          // Execute the transfer
          let transferResult = await ckbtcLedger.icrc1_transfer(transferArgs);
          
          switch (transferResult) {
            case (#Ok(blockIndex)) {
              Debug.print("Transfer successful, block index: " # Nat.toText(blockIndex));
              
              // Update booster account - subtract amount + fee from available balance
              let updatedAccount : Types.BoosterAccount = {
                owner = boosterAccount.owner;
                subaccount = boosterAccount.subaccount;
                totalDeposited = boosterAccount.totalDeposited;
                availableBalance = boosterAccount.availableBalance - (amountToWithdraw + standardFee);
                createdAt = boosterAccount.createdAt;
                updatedAt = Time.now();
              };
              
              state.boosterAccounts.put(booster, updatedAccount);
              
              return #ok(updatedAccount);
            };
            case (#Err(err)) {
              let errorMsg = switch (err) {
                case (#BadFee(details)) { "Bad fee: expected " # Nat.toText(details.expected_fee) };
                case (#BadBurn(details)) { "Bad burn: minimum " # Nat.toText(details.min_burn_amount) };
                case (#InsufficientFunds(details)) { "Insufficient funds: balance " # Nat.toText(details.balance) };
                case (#TooOld) { "Transaction too old" };
                case (#CreatedInFuture(details)) { "Transaction created in future: ledger time " # Nat64.toText(details.ledger_time) };
                case (#Duplicate(details)) { "Duplicate transaction: duplicate of " # Nat.toText(details.duplicate_of) };
                case (#TemporarilyUnavailable) { "Service temporarily unavailable" };
                case (#GenericError(details)) { "Error: " # details.message # " (code: " # Nat.toText(details.error_code) # ")" };
              };
              
              Debug.print("Transfer error: " # errorMsg);
              return #err("Transfer failed: " # errorMsg);
            };
          };
        } catch (error) {
          let errorMsg = Error.message(error);
          Debug.print("Error during withdrawal: " # errorMsg);
          return #err("Error transferring funds: " # errorMsg);
        };
      };
    };
  };

  // Utility Functions
  public query func getCanisterPrincipal() : async Text {
    return CANISTER_PRINCIPAL;
  };

  public func getDirectBTCAddress() : async Text {
    await BtcUtils.getDirectBTCAddress();
  };

  public query func getPendingBoostRequests(): async [Types.BoostRequest] {
    let buffer = Buffer.Buffer<Types.BoostRequest>(state.boostRequests.size());
    for (request in state.boostRequests.vals()) {
      if (request.booster == null) {
          buffer.add(request);
      };
    };
 
    return Buffer.toArray(buffer);
  };

  // Function for a booster to accept/execute a boost request
  public shared(msg) func acceptBoostRequest(boostId: Types.BoostId): async Result.Result<Text, Text> {
    let caller = msg.caller;
    let now = Time.now();

    // 1. Get Booster Account (Combined declaration and switch)
    var currentBoosterAccount : Types.BoosterAccount = switch (state.boosterAccounts.get(caller)) {
      case (?account) account;
      case (null) return #err("Caller is not a registered booster."); // Return directly from switch
    };

    // 2. Get Boost Request (Combined declaration and switch)
    var currentBoostRequest : Types.BoostRequest = switch (state.boostRequests.get(boostId)) {
      case (?request) request;
      case (null) return #err("Boost request not found."); // Return directly from switch
    };

    // 3. Validate Request Status
    if (currentBoostRequest.booster != null) {
      return #err("Boost request has already been accepted.");
    };
    
    // 4. Check Booster Balance
    let requiredAmount = currentBoostRequest.amount;
    if (currentBoosterAccount.availableBalance < requiredAmount) {
        return #err("Insufficient available balance in booster account.");
    };
    
    // --- TODO: Implement ckBTC transfer and state updates --- 
    
    // Placeholder success return
    return #ok("Boost request accepted (placeholder - no transfer/state update yet).");
    
  };
}