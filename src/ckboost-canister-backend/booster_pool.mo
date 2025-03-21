import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";

import Types "./types";
import Utils "./utils";
import StateModule "./state";

module {
  public class BoosterPoolManager(state: StateModule.State) {
    public func registerPool(fee: Types.Fee) : async Result.Result<Types.BoosterPool, Text> {
      if (fee < 0.0 or fee > 100.0) {
        return #err("Fee must be between 0% and 100%");
      };
      
      let poolId = state.getNextBoosterPoolId();
      let adminPrincipal = Principal.fromText(Types.POOL_ADMIN_PRINCIPAL);
      let now = Time.now();
      
      let boosterPool : Types.BoosterPool = {
        id = poolId;
        owner = adminPrincipal;
        fee = fee;
        createdAt = now;
        updatedAt = now;
      };
      
      state.boosterPools.put(poolId, boosterPool);
      #ok(boosterPool)
    };

    public func getAllPools() : [Types.BoosterPool] {
      Iter.toArray(state.boosterPools.vals())
    };
  };
} 