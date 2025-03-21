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
  // Define a class that takes a state object
  public class BoosterPoolManager(state: StateModule.State) {
    // Register a new booster pool
    public func registerBoosterPool(caller: Principal, fee: Types.Fee) : async Result.Result<Types.BoosterPool, Text> {
      if (fee < 0.0 or fee > 2.0) {
        return #err("Fee must be between 0% and 2%");
      };
      
      let poolId = state.getNextBoosterPoolId();
      
      let now = Time.now();
      let subaccount = Utils.generateBoosterPoolSubaccount(caller, poolId);
      
      let boosterPool : Types.BoosterPool = {
        id = poolId;
        owner = caller;
        fee = fee;
        subaccount = subaccount;
        availableAmount = 0;
        totalBoosted = 0;
        createdAt = now;
        updatedAt = now;
      };
      
      state.boosterPools.put(poolId, boosterPool);
      return #ok(boosterPool);
    };
    
    // Update a booster pool's available amount
    public func updateAvailableAmount(poolId: Types.BoosterPoolId, amount: Types.Amount) : Result.Result<Types.BoosterPool, Text> {
      switch (state.boosterPools.get(poolId)) {
        case (null) {
          return #err("Booster pool not found");
        };
        case (?pool) {
          let updatedPool : Types.BoosterPool = {
            id = pool.id;
            owner = pool.owner;
            fee = pool.fee;
            subaccount = pool.subaccount;
            availableAmount = amount;
            totalBoosted = pool.totalBoosted;
            createdAt = pool.createdAt;
            updatedAt = Time.now();
          };
          
          state.boosterPools.put(poolId, updatedPool);
          return #ok(updatedPool);
        };
      };
    };
    
    // Update a booster pool's total boosted amount
    public func updateTotalBoosted(poolId: Types.BoosterPoolId, amount: Types.Amount) : Result.Result<Types.BoosterPool, Text> {
      switch (state.boosterPools.get(poolId)) {
        case (null) {
          return #err("Booster pool not found");
        };
        case (?pool) {
          let updatedPool : Types.BoosterPool = {
            id = pool.id;
            owner = pool.owner;
            fee = pool.fee;
            subaccount = pool.subaccount;
            availableAmount = pool.availableAmount;
            totalBoosted = amount;
            createdAt = pool.createdAt;
            updatedAt = Time.now();
          };
          
          state.boosterPools.put(poolId, updatedPool);
          return #ok(updatedPool);
        };
      };
    };
    
    // Query functions
    public func getBoosterPool(id: Types.BoosterPoolId) : ?Types.BoosterPool {
      state.boosterPools.get(id)
    };
    
    public func getUserBoosterPools(user: Principal) : [Types.BoosterPool] {
      let userPools = Buffer.Buffer<Types.BoosterPool>(0);
      for ((_, pool) in state.boosterPools.entries()) {
        if (Principal.equal(pool.owner, user)) {
          userPools.add(pool);
        };
      };
      return Buffer.toArray(userPools);
    };
    
    public func getAllBoosterPools() : [Types.BoosterPool] {
      Iter.toArray(Iter.map<(Types.BoosterPoolId, Types.BoosterPool), Types.BoosterPool>(
        state.boosterPools.entries(), 
        func ((_, v)) { v }
      ))
    };
  };
} 