import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Nat "mo:base/Nat";

import Types "./types";
import StateModule "./state";
import BtcUtils "./btc_utils";
import BoostRequestModule "./boost_request";
import Ledger "./ledger";
import Validation "./validation";
import BoosterAccount "./booster_account";
import MintingOperations "./minting_operations";

persistent actor class Main() {
  // Constants
  private transient let CANISTER_PRINCIPAL = Principal.fromText("75egi-7qaaa-aaaao-qj6ma-cai");
  private transient let CKBTC_LEDGER_CANISTER_ID = Principal.fromText("mc6ru-gyaaa-aaaar-qaaaq-cai");

  // Initialize state and managers
  transient let state = StateModule.State();
  private transient let boostRequestManager = BoostRequestModule.BoostRequestManager(state);
  private transient let ledgerOps = Ledger.LedgerOperations(CKBTC_LEDGER_CANISTER_ID);
  private transient let boosterAccountManager = BoosterAccount.BoosterAccountManager(state, ledgerOps, CANISTER_PRINCIPAL);
  private transient let mintingOps = MintingOperations.MintingOperations(state, ledgerOps, CANISTER_PRINCIPAL);
  
  // System functions for stable storage
  system func preupgrade() {
    // Implementation of state preservation logic here
  };
  
  system func postupgrade() {
    // Implementation of state restoration logic here
  };

  // === BOOST REQUEST FUNCTIONS ===
  
  public shared(msg) func registerBoostRequest(
    amount: Types.Amount, 
    maxFeePercentage: Float, 
    confirmationsRequired: Nat, 
    preferredBooster: ?Principal
  ) : async Result.Result<Types.BoostRequest, Text> {
    // Validate inputs
    switch(Validation.validateBoostRequestParams(amount, maxFeePercentage, confirmationsRequired)) {
      case (#err(e)) return #err(e);
      case _ {};
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
      case (null) return #err("Boost request not found");
      case _ await boostRequestManager.getBoostRequestBTCAddress(boostId);
    };
  };
  
  public func updateReceivedBTC(boostId: Types.BoostId, receivedAmount: Types.Amount) : async Result.Result<Types.BoostRequest, Text> {
    switch(Validation.validateAmount(receivedAmount, "Received amount")) {
      case (#err(e)) return #err(e);
      case _ {};
    };
    
    switch (state.boostRequests.get(boostId)) {
      case (null) return #err("Boost request not found");
      case _ await boostRequestManager.updateReceivedBTC(boostId, receivedAmount);
    };
  };

  // === BOOST EXECUTION ===
  
  public shared(msg) func acceptBoostRequest(boostId: Types.BoostId): async Text {
    let caller = msg.caller;
    let now = Time.now();

    // Get and validate booster account
    var currentBoosterAccount : Types.BoosterAccount = switch (state.boosterAccounts.get(caller)) {
      case (?account) account;
      case (null) return "ERROR - Caller is not a registered booster.";
    };

    // Get and validate boost request
    var currentBoostRequest : Types.BoostRequest = switch (state.boostRequests.get(boostId)) {
      case (?request) request;
      case (null) return "ERROR - Boost request not found.";
    };

    // Validate request state
    if (currentBoostRequest.status != #pending) {
      return "ERROR - Boost request is not in pending status.";
    };
    if (currentBoostRequest.booster != null) {
      return "ERROR - Boost request has already been accepted.";
    };
    
    // Check preferred booster
    switch (currentBoostRequest.preferredBooster) {
      case (?preferred) {
        if (preferred != caller) {
          return "ERROR - This boost request is reserved for a specific booster.";
        };
      };
      case (null) {};
    };
    
    // Check balance
    let requiredAmount = currentBoostRequest.amount;
    if (currentBoosterAccount.availableBalance < requiredAmount + Ledger.STANDARD_FEE) {
        return "ERROR - Insufficient available balance (incl. fee) in booster account.";
    };
    
    // Execute transfer
    let transferArgs : Ledger.TransferArgs = {
      from_subaccount = ?currentBoosterAccount.subaccount;
      to = { owner = currentBoostRequest.owner; subaccount = null; };
      amount = requiredAmount;
      fee = ?Ledger.STANDARD_FEE;
      memo = null;
      created_at_time = null;
    };
    
    let transferResult = await ledgerOps.transferWithLogging(transferArgs, "Boost");
    
    switch (transferResult) {
      case (#ok(_blockIndex)) {
        // Update booster account
        let updatedBoosterAccount : Types.BoosterAccount = {
          owner = currentBoosterAccount.owner;
          subaccount = currentBoosterAccount.subaccount;
          totalDeposited = currentBoosterAccount.totalDeposited;
          availableBalance = currentBoosterAccount.availableBalance - requiredAmount - Ledger.STANDARD_FEE; 
          createdAt = currentBoosterAccount.createdAt;
          updatedAt = now;
        };
        
        state.boosterAccounts.put(caller, updatedBoosterAccount);
        
        // Update boost request
        let updatedBoostRequest : Types.BoostRequest = {
          id = currentBoostRequest.id;
          owner = currentBoostRequest.owner;
          amount = currentBoostRequest.amount;
          receivedBTC = currentBoostRequest.receivedBTC;
          btcAddress = currentBoostRequest.btcAddress;
          subaccount = currentBoostRequest.subaccount;
          status = #boosted;
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
      case (#err(errorMsg)) {
        return "ERROR - Transfer Failed: " # errorMsg;
      };
    };
  };

  // === BOOSTER ACCOUNT MANAGEMENT ===
  
  public shared(msg) func registerBoosterAccount() : async Result.Result<Types.BoosterAccount, Text> {
    boosterAccountManager.registerBoosterAccount(msg.caller);
  };
  
  public func updateBoosterDeposit(booster: Principal, amount: Types.Amount) : async Result.Result<Types.BoosterAccount, Text> {
    await boosterAccountManager.updateBoosterDeposit(booster, amount);
  };
  
  public shared(msg) func withdrawBoosterFunds(amount: Types.Amount) : async Text {
    await boosterAccountManager.withdrawBoosterFunds(msg.caller, amount);
  };

  // === MINTING OPERATIONS ===
  
  public shared(msg) func triggerMintingForMyBoostRequest(boostId: Types.BoostId): async Text {
    await mintingOps.triggerMintingForUser(msg.caller, boostId);
  };

  public shared(msg) func claimMintedCKBTC(boostId: Types.BoostId): async Text {
    await mintingOps.claimMintedCKBTCForUser(msg.caller, boostId);
  };

  public shared(msg) func triggerMintingForBoostReclaim(boostId: Types.BoostId): async Text {
    await mintingOps.triggerMintingForBooster(msg.caller, boostId);
  };

  public shared(msg) func reclaimMintedFunds(boostId: Types.BoostId): async Text {
    await mintingOps.claimMintedFundsForBooster(msg.caller, boostId);
  };

  // === QUERY FUNCTIONS ===
  
  public query func getBoostRequest(id: Types.BoostId) : async ?Types.BoostRequest {
    boostRequestManager.getBoostRequest(id);
  };
  
  public query func getUserBoostRequests(user: Principal) : async [Types.BoostRequest] {
    boostRequestManager.getUserBoostRequests(user);
  };
  
  public query func getAllBoostRequests() : async [Types.BoostRequest] {
    boostRequestManager.getAllBoostRequests();
  };

  public query func getBoosterAccount(booster: Principal) : async ?Types.BoosterAccount {
    boosterAccountManager.getBoosterAccount(booster);
  };
  
  public query func getAllBoosterAccounts() : async [Types.BoosterAccount] {
    boosterAccountManager.getAllBoosterAccounts();
  };

  public query func getPendingBoostRequests(): async [Types.BoostRequest] {
    let buffer = Buffer.Buffer<Types.BoostRequest>(state.boostRequests.size());
    for (request in state.boostRequests.vals()) {
      if (request.status == #pending) {
          buffer.add(request);
      };
    };
    Buffer.toArray(buffer);
  };

  public query func getBoostedRequests(): async [Types.BoostRequest] {
    let buffer = Buffer.Buffer<Types.BoostRequest>(state.boostRequests.size());
    for (request in state.boostRequests.vals()) {
      if (request.status == #boosted) {
          buffer.add(request);
      };
    };
    Buffer.toArray(buffer);
  };

  public query func getMintingRequests(): async [Types.BoostRequest] {
    let buffer = Buffer.Buffer<Types.BoostRequest>(state.boostRequests.size());
    for (request in state.boostRequests.vals()) {
      if (request.status == #minting) {
          buffer.add(request);
      };
    };
    Buffer.toArray(buffer);
  };

  // === UTILITY FUNCTIONS ===
  
  public query func getCanisterPrincipal() : async Principal {
    CANISTER_PRINCIPAL;
  };

  public func getDirectBTCAddress() : async Text {
    await BtcUtils.getDirectBTCAddress();
  };
}