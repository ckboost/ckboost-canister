import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";

import Types "./types";
import Utils "./utils";

module {
  // Define a class that can be instantiated in the main actor
  public class State(initialBoostId: Types.BoostId, initialBoosterPoolId: Types.BoosterPoolId) {
    // State variables
    public var nextBoostId: Types.BoostId = initialBoostId;
    public var nextBoosterPoolId: Types.BoosterPoolId = initialBoosterPoolId;
    
    public var boostRequests = HashMap.HashMap<Types.BoostId, Types.BoostRequest>(0, Nat.equal, Utils.natHash);
    public var boosterPools = HashMap.HashMap<Types.BoosterPoolId, Types.BoosterPool>(0, Nat.equal, Utils.natHash);
    
    // Helper functions for state management
    public func getNextBoostId() : Types.BoostId {
      let id = nextBoostId;
      nextBoostId += 1;
      return id;
    };
    
    public func getNextBoosterPoolId() : Types.BoosterPoolId {
      let id = nextBoosterPoolId;
      nextBoosterPoolId += 1;
      return id;
    };
  };
} 