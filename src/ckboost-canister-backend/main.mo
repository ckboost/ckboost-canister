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
  private let CANISTER_PRINCIPAL: Text = "b5hua-hiaaa-aaaae-qcuvq-cai";
  private let ckBTCMinter : Minter.CkBtcMinterInterface = actor(Minter.CKBTC_MINTER_CANISTER_ID);
  private let FIXED_FEE: Types.Fee = 1.5;
  
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

  public func registerBoostRequest(args: Types.RegisterBoostRequestArgs) : async Result.Result<Types.BoostRequest, Text> {
    if (args.amount <= 0.0) {
      return #err("Amount must be greater than 0");
    };
    await boostRequestManager.registerBoostRequest(args.user, args.amount, FIXED_FEE, args.preferredBPPrincipal);
  };

  public shared(msg) func registerPool(args: Types.RegisterPoolArgs) : async Result.Result<Types.BoosterPool, Text> {
    if (Principal.toText(msg.caller) != Types.POOL_ADMIN_PRINCIPAL) {
      return #err("Unauthorized: only pool admin can register pools");
    };
    await boosterPoolManager.registerPool(args.fee);
  };

  public query func getAllPools() : async [Types.BoosterPool] {
    boosterPoolManager.getAllPools()
  };
}