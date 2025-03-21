import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import HashMap "mo:base/HashMap";

import Types "./types";
import Utils "./utils";
import StateModule "./state";
import Minter "./minter";
import BtcUtils "./btc_utils";
import BoostRequestModule "./boost_request";
import BoosterPoolModule "./booster_pool";

actor CKBoost {
  // Stable variables for persistence
  private stable var nextBoostId: Types.BoostId = 1;
  private stable var nextBoosterPoolId: Types.BoosterPoolId = 1;
  private stable var boostRequestEntries : [(Types.BoostId, Types.BoostRequest)] = [];
  private stable var boosterPoolEntries : [(Types.BoosterPoolId, Types.BoosterPool)] = [];
  
  // Initialize state with stable variables
  private let state = StateModule.State(nextBoostId, nextBoosterPoolId);
  
  // Initialize managers
  private let boostRequestManager = BoostRequestModule.BoostRequestManager(state);
  private let boosterPoolManager = BoosterPoolModule.BoosterPoolManager(state);
  
  // Constants
  private let CANISTER_PRINCIPAL: Text = "75egi-7qaaa-aaaao-qj6ma-cai";
  private let ckBTCMinter : Minter.CkBtcMinterInterface = actor(Minter.CKBTC_MINTER_CANISTER_ID);
  
  // System functions for stable storage
  system func preupgrade() {
    boostRequestEntries := Iter.toArray(state.boostRequests.entries());
    boosterPoolEntries := Iter.toArray(state.boosterPools.entries());
    nextBoostId := state.nextBoostId;
    nextBoosterPoolId := state.nextBoosterPoolId;
  };
  
  system func postupgrade() {
    state.boostRequests := HashMap.fromIter<Types.BoostId, Types.BoostRequest>(
      boostRequestEntries.vals(), 
      boostRequestEntries.size(), 
      Nat.equal, 
      Utils.natHash
    );
    boostRequestEntries := [];
    
    state.boosterPools := HashMap.fromIter<Types.BoosterPoolId, Types.BoosterPool>(
      boosterPoolEntries.vals(), 
      boosterPoolEntries.size(), 
      Nat.equal, 
      Utils.natHash
    );
    boosterPoolEntries := [];
    
    state.nextBoostId := nextBoostId;
    state.nextBoosterPoolId := nextBoosterPoolId;
  };

  // Boost Request Functions
  public shared(msg) func registerBoostRequest(amount: Types.Amount, fee: Types.Fee) : async Result.Result<Types.BoostRequest, Text> {
    await boostRequestManager.registerBoostRequest(msg.caller, amount, fee);
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

  // Booster Pool Functions
  public shared(msg) func registerBoosterPool(fee: Types.Fee) : async Result.Result<Types.BoosterPool, Text> {
    await boosterPoolManager.registerBoosterPool(msg.caller, fee);
  };
  
  public func updateAvailableAmount(poolId: Types.BoosterPoolId, amount: Types.Amount) : async Result.Result<Types.BoosterPool, Text> {
    boosterPoolManager.updateAvailableAmount(poolId, amount);
  };
  
  public func updateTotalBoosted(poolId: Types.BoosterPoolId, amount: Types.Amount) : async Result.Result<Types.BoosterPool, Text> {
    boosterPoolManager.updateTotalBoosted(poolId, amount);
  };
  
  public query func getBoosterPool(id: Types.BoosterPoolId) : async ?Types.BoosterPool {
    boosterPoolManager.getBoosterPool(id);
  };
  
  public query func getUserBoosterPools(user: Principal) : async [Types.BoosterPool] {
    boosterPoolManager.getUserBoosterPools(user);
  };
  
  public query func getAllBoosterPools() : async [Types.BoosterPool] {
    boosterPoolManager.getAllBoosterPools();
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