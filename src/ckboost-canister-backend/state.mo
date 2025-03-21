import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";

import Types "./types";
import Utils "./utils";

module {
  // Define a class that can be instantiated in the main actor
  public class State(initialBoostId: Types.BoostId) {
    // State variables
    public var nextBoostId: Types.BoostId = initialBoostId;
    public var nextTransactionId: Nat = 0;
    
    public var boostRequests = HashMap.HashMap<Types.BoostId, Types.BoostRequest>(0, Nat.equal, Utils.natHash);
    public var transactions = HashMap.HashMap<Nat, Types.Transaction>(0, Nat.equal, Utils.natHash);
    
    // Helper functions for state management
    public func getNextBoostId() : Types.BoostId {
      let id = nextBoostId;
      nextBoostId += 1;
      return id;
    };
    
    public func getNextTransactionId() : Nat {
      let id = nextTransactionId;
      nextTransactionId += 1;
      return id;
    };

    public func addTransaction(transaction: Types.Transaction) {
      transactions.put(transaction.id, transaction);
    };

    public func getTransaction(id: Nat) : ?Types.Transaction {
      transactions.get(id)
    };

    public func getTransactionsByProvider(provider: Principal) : [Types.Transaction] {
      Iter.toArray(
        Iter.filter(
          transactions.vals(), 
          func (t: Types.Transaction) : Bool { t.provider == provider }
        )
      )
    };
  };
} 