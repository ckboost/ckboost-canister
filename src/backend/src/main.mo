import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import HashMap "mo:base/HashMap";

import Types "./types";
import Utils "./utils";
import StateModule "./state";
import Minter "./minter";
import BtcUtils "./btc_utils";
import BoostRequestModule "./boost_request";

actor CKBoost {
  // Stable variables for persistence
  private stable var nextBoostId: Types.BoostId = 1;
  private stable var boostRequestEntries : [(Types.BoostId, Types.BoostRequest)] = [];
  private stable var boosterAccountEntries : [(Principal, Types.BoosterAccount)] = [];
  
  // Initialize state with stable variables
  private let state = StateModule.State(nextBoostId);
  
  // Initialize managers
  private let boostRequestManager = BoostRequestModule.BoostRequestManager(state);
  
  // Constants
  private let CANISTER_PRINCIPAL: Text = "75egi-7qaaa-aaaao-qj6ma-cai";
  private let ckBTCMinter : Minter.CkBtcMinterInterface = actor(Minter.CKBTC_MINTER_CANISTER_ID);
  
  // System functions for stable storage
  system func preupgrade() {
    boostRequestEntries := Iter.toArray(state.boostRequests.entries());
    boosterAccountEntries := Iter.toArray(state.boosterAccounts.entries());
    nextBoostId := state.nextBoostId;
  };
  
  system func postupgrade() {
    state.boostRequests := HashMap.fromIter<Types.BoostId, Types.BoostRequest>(
      boostRequestEntries.vals(), 
      boostRequestEntries.size(), 
      Nat.equal, 
      Utils.natHash
    );
    boostRequestEntries := [];
    
    state.boosterAccounts := HashMap.fromIter<Principal, Types.BoosterAccount>(
      boosterAccountEntries.vals(), 
      boosterAccountEntries.size(), 
      Principal.equal, 
      Principal.hash
    );
    boosterAccountEntries := [];
    
    state.nextBoostId := nextBoostId;
  };

  // Boost Request Functions
  public shared(msg) func registerBoostRequest(amount: Types.Amount, fee: Types.Fee, maxFeePercentage: Float, confirmationsRequired: Nat) : async Result.Result<Types.BoostRequest, Text> {
    await boostRequestManager.registerBoostRequest(msg.caller, amount, fee, maxFeePercentage, confirmationsRequired);
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

  // Utility Functions
  public query func getCanisterPrincipal() : async Text {
    return CANISTER_PRINCIPAL;
  };

  // Direct method to get a BTC address for testing
  public func getDirectBTCAddress() : async Text {
    await BtcUtils.getDirectBTCAddress();
  };
}