import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Nat64 "mo:base/Nat64";
import Int64 "mo:base/Int64";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";
import Blob "mo:base/Blob";
import Array "mo:base/Array";

import Types "./types";
import Utils "./utils";
import StateModule "./state";
import Minter "./minter";
import BtcUtils "./btc_utils";
import Constants "./constants";
import ProviderModule "./provider";

module {
  public class BoostRequestManager(state: StateModule.State, providerManager: ProviderModule.ProviderManager) {
    let ckBTCMinter : Minter.CkBtcMinterInterface = actor(Constants.CKBTC_MINTER_CANISTER_ID);

    public func getBTCAddress(subaccount: Types.Subaccount) : async Text {
      try {
        let canisterPrincipal = Principal.fromText(Constants.CANISTER_PRINCIPAL);
        
        let args = {
          owner = ?canisterPrincipal;
          subaccount = ?Blob.fromArray(subaccount);
        };
        let btcAddress = await ckBTCMinter.get_btc_address(args);
        return btcAddress;
      } catch (e) {
        throw Error.reject("Error getting BTC address: " # Error.message(e));
      };
    };

    // Check for BTC deposits to a specific address
    public func checkBTCDeposit(boostId: Types.BoostId) : async Result.Result<Types.BoostRequest, Text> {
      switch (state.boostRequests.get(boostId)) {
        case (null) {
          return #err("Boost request not found");
        };
        case (?request) {
          try {
            let canisterPrincipal = Principal.fromText(Constants.CANISTER_PRINCIPAL);
            
            let args = {
              owner = ?canisterPrincipal;
              subaccount = ?Blob.fromArray(request.subaccount);
            };
            
            let updateResult = await BtcUtils.ckBTCMinter.update_balance(args);
            
            switch (updateResult) {
              case (#Ok(result)) {
                Debug.print("Found deposits: " # Nat64.toText(result.amount) # " satoshis");
                // Convert satoshis to BTC (1 BTC = 100,000,000 satoshis)
                let satoshisInt64 = Int64.fromNat64(result.amount);
                let btcAmount : Float = Float.fromInt64(satoshisInt64) / Constants.SATOSHI_CONVERSION;
                let updatedRequest = await updateReceivedBTC(boostId, btcAmount);
                return updatedRequest;
              };
              case (#Err(error)) {
                switch (error) {
                  case (#NoNewUtxos(_)) {
                    Debug.print("No new deposits detected for boost request " # Nat.toText(boostId));
                    return #err("No new deposits detected");
                  };
                  case (#AlreadyProcessing) {
                    return #err("Already processing deposits");
                  };
                  case (#TemporarilyUnavailable(msg)) {
                    return #err("Service temporarily unavailable: " # msg);
                  };
                  case (#GenericError({ error_message; error_code = _ })) {
                    return #err("Error checking deposits: " # error_message);
                  };
                };
              };
            };
          } catch (e) {
            Debug.print("Error checking deposits: " # Error.message(e));
            return #err("Error checking deposits: " # Error.message(e));
          };
        };
      };
    };

    // Register a new boost request
    public func registerBoostRequest(
      owner: Principal,
      args: Types.RegisterBoostRequestArgs
    ) : async Result.Result<Types.BoostRequest, Text> {
      if (args.amount <= 0.0) {
        return #err("Amount must be greater than 0");
      };

      // Validate preferred provider if specified
      switch (args.preferredProvider) {
        case (?provider) {
          switch (providerManager.getProvider(provider)) {
            case (null) {
              return #err("Preferred provider does not exist");
            };
            case (?providerData) {
              if (not providerData.isActive) {
                return #err("Preferred provider is not active");
              };
              
              if (providerData.availableBalance < args.amount) {
                return #err("Preferred provider has insufficient available balance");
              };
            };
          };
        };
        case (null) {
            return #err("Not supporting empty preferred provders at the moment");
        };
      };

      let boostId = state.getNextBoostId();
      let now = Time.now();

      // Generate a unique subaccount for this boost request
      let subaccount = Utils.generateSubaccount(owner, boostId);

      // Get BTC address for the subaccount
      let btcAddressResult = await BtcUtils.getBTCAddress(subaccount);
      
      switch (btcAddressResult) {
        case (#err(e)) return #err(e);
        case (#ok(btcAddress)) {
          let request : Types.BoostRequest = {
            id = boostId;
            owner = owner;
            amount = args.amount;
            maxFee = switch (args.maxFee) {
              case (null) Constants.DEFAULT_FEE_PERCENTAGE;
              case (?fee) fee;
            };
            receivedBTC = 0.0;
            btcAddress = ?btcAddress;
            subaccount = subaccount;
            status = #pending;
            matchedProvider = null;
            preferredProvider = args.preferredProvider;
            createdAt = now;
            updatedAt = now;
          };

          state.boostRequests.put(boostId, request);
          #ok(request)
        };
      }
    };

    // Update received BTC amount for a boost request
    public func updateReceivedBTC(boostId: Types.BoostId, receivedAmount: Types.Amount) : async Result.Result<Types.BoostRequest, Text> {
      switch (state.boostRequests.get(boostId)) {
        case (null) {
          return #err("Boost request not found");
        };
        case (?request) {
          let updatedRequest : Types.BoostRequest = {
            id = request.id;
            owner = request.owner;
            amount = request.amount;
            maxFee = request.maxFee;
            receivedBTC = receivedAmount;
            btcAddress = request.btcAddress;
            subaccount = request.subaccount;
            status = request.status;
            matchedProvider = request.matchedProvider;
            preferredProvider = request.preferredProvider;
            createdAt = request.createdAt;
            updatedAt = Time.now();
          };
          
          state.boostRequests.put(boostId, updatedRequest);
          return #ok(updatedRequest);
        };
      };
    };

    // Update BTC address for a boost request
    public func updateBTCAddress(boostId: Types.BoostId, btcAddress: Text) : async Result.Result<Types.BoostRequest, Text> {      
      switch (state.boostRequests.get(boostId)) {
        case (null) {
          Debug.print("Boost request not found: " # Nat.toText(boostId));
          return #err("Boost request not found");
        };
        case (?request) {
          let updatedRequest : Types.BoostRequest = {
            id = request.id;
            owner = request.owner;
            amount = request.amount;
            maxFee = request.maxFee;
            receivedBTC = request.receivedBTC;
            btcAddress = ?btcAddress;
            subaccount = request.subaccount;
            status = request.status;
            matchedProvider = request.matchedProvider;
            preferredProvider = request.preferredProvider;
            createdAt = request.createdAt;
            updatedAt = Time.now();
          };
          
          state.boostRequests.put(boostId, updatedRequest);
          Debug.print("Successfully updated boost request with BTC address");
          return #ok(updatedRequest);
        };
      };
    };

    // Get BTC address for an existing boost request
    public func getBoostRequestBTCAddress(boostId: Types.BoostId) : async Result.Result<Text, Text> {
      switch (state.boostRequests.get(boostId)) {
        case (null) {
          return #err("Boost request not found");
        };
        case (?request) {
          switch (request.btcAddress) {
            case (null) {
              try {
                let btcAddressResult = await BtcUtils.getBTCAddress(request.subaccount);
                
                switch (btcAddressResult) {
                  case (#ok(btcAddress)) {
                    ignore await updateBTCAddress(boostId, btcAddress);
                    return #ok(btcAddress);
                  };
                  case (#err(error)) {
                    return #err(error);
                  };
                };
              } catch (e) {
                return #err(Error.message(e));
              };
            };
            case (?address) {
              return #ok(address);
            };
          };
        };
      };
    };

    // Query functions
    public func getBoostRequest(id: Types.BoostId) : ?Types.BoostRequest {
      state.boostRequests.get(id)
    };
    
    public func getUserBoostRequests(user: Principal) : [Types.BoostRequest] {
      let userRequests = Buffer.Buffer<Types.BoostRequest>(0);
      for ((_, request) in state.boostRequests.entries()) {
        if (Principal.equal(request.owner, user)) {
          userRequests.add(request);
        };
      };
      return Buffer.toArray(userRequests);
    };
    
    public func getAllBoostRequests() : [Types.BoostRequest] {
      Iter.toArray(Iter.map<(Types.BoostId, Types.BoostRequest), Types.BoostRequest>(
        state.boostRequests.entries(), 
        func ((_, v)) { v }
      ))
    };

    public func updateBoostRequest(
      id: Types.BoostId,
      status: Types.BoostStatus,
      receivedBTC: ?Types.Amount,
      matchedProvider: ?Principal
    ) : Result.Result<Types.BoostRequest, Text> {
      switch (state.boostRequests.get(id)) {
        case null #err("Boost request not found");
        case (?request) {
          let updatedRequest : Types.BoostRequest = {
            id = request.id;
            owner = request.owner;
            amount = request.amount;
            maxFee = request.maxFee;
            receivedBTC = switch (receivedBTC) {
              case (null) request.receivedBTC;
              case (?amount) amount;
            };
            btcAddress = request.btcAddress;
            subaccount = request.subaccount;
            status = status;
            matchedProvider = matchedProvider;
            preferredProvider = request.preferredProvider;
            createdAt = request.createdAt;
            updatedAt = Time.now();
          };

          state.boostRequests.put(id, updatedRequest);
          #ok(updatedRequest)
        };
      }
    };

    // Get all boost requests for a specific provider
    public func getBoostRequestsByProvider(provider: Principal) : [Types.BoostRequest] {
      let requests = Buffer.Buffer<Types.BoostRequest>(0);
      
      for ((_, request) in state.boostRequests.entries()) {
        switch (request.preferredProvider) {
          case (?preferredProvider) {
            if (preferredProvider == provider) {
              requests.add(request);
            };
          };
          case null {};
        };
      };
      
      Buffer.toArray(requests)
    };

    // Get boost requests by status
    public func getBoostRequestsByStatus(status: Types.BoostStatus) : [Types.BoostRequest] {
      let requests = Buffer.Buffer<Types.BoostRequest>(0);
      
      for ((_, request) in state.boostRequests.entries()) {
        if (request.status == status) {
          requests.add(request);
        };
      };
      
      Buffer.toArray(requests)
    };

    // Get pending boost requests for a specific provider
    public func getPendingBoostRequestsForProvider(provider: Principal) : [Types.BoostRequest] {
      let requests = Buffer.Buffer<Types.BoostRequest>(0);
      
      for ((_, request) in state.boostRequests.entries()) {
        switch (request.preferredProvider) {
          case (?preferredProvider) {
            if (preferredProvider == provider and request.status == #pending) {
              requests.add(request);
            };
          };
          case null {};
        };
      };
      
      // Sort by creation time (oldest first)
      let array = Buffer.toArray(requests);
      Array.sort(array, func(a: Types.BoostRequest, b: Types.BoostRequest) : {#less; #equal; #greater} {
        if (a.createdAt < b.createdAt) #less
        else if (a.createdAt == b.createdAt) #equal
        else #greater
      })
    };

    // Get boost requests by provider and status
    public func getBoostRequestsByProviderAndStatus(provider: Principal, status: Types.BoostStatus) : [Types.BoostRequest] {
      let requests = Buffer.Buffer<Types.BoostRequest>(0);
      
      for ((_, request) in state.boostRequests.entries()) {
        switch (request.preferredProvider) {
          case (?preferredProvider) {
            if (preferredProvider == provider and request.status == status) {
              requests.add(request);
            };
          };
          case null {};
        };
      };
      
      // Sort by creation time (oldest first)
      let array = Buffer.toArray(requests);
      Array.sort(array, func(a: Types.BoostRequest, b: Types.BoostRequest) : {#less; #equal; #greater} {
        if (a.createdAt < b.createdAt) #less
        else if (a.createdAt == b.createdAt) #equal
        else #greater
      })
    };
  };
} 