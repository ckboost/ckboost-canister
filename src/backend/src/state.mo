import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";

import Types "./types";
import Utils "./utils";

module {
  // Define a class that can be instantiated in the main actor
  public class State() {
    // State variables
    public var nextBoostId: Types.BoostId = 1;
    
    public var boostRequests = HashMap.HashMap<Types.BoostId, Types.BoostRequest>(0, Nat.equal, Utils.natHash);
    public var boosterAccounts = HashMap.HashMap<Principal, Types.BoosterAccount>(0, Principal.equal, Principal.hash);
    
    // Helper functions for state management
    public func getNextBoostId() : Types.BoostId {
      let id = nextBoostId;
      nextBoostId += 1;
      return id;
    };
  };
} 