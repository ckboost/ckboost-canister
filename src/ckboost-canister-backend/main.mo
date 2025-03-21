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
import ProviderModule "./provider";

actor CKBoost {
  // Stable variables for upgrade persistence
  private stable var nextBoostId: Types.BoostId = 1;
  private stable var boostRequestEntries : [(Types.BoostId, Types.BoostRequest)] = [];
  private stable var transactionEntries : [(Nat, Types.Transaction)] = [];

  // Initialize state
  private let state = StateModule.State(nextBoostId);
  private let providerManager = ProviderModule.ProviderManager(state);
  private let boostRequestManager = BoostRequestModule.BoostRequestManager(state, providerManager);

  // Pre-upgrade
  system func preupgrade() {
    boostRequestEntries := Iter.toArray(state.boostRequests.entries());
    transactionEntries := Iter.toArray(state.transactions.entries());
    nextBoostId := state.nextBoostId;
  };

  // Post-upgrade
  system func postupgrade() {
    state.boostRequests := HashMap.fromIter<Types.BoostId, Types.BoostRequest>(
      boostRequestEntries.vals(),
      boostRequestEntries.size(),
      Nat.equal,
      Utils.natHash,
    );

    state.transactions := HashMap.fromIter<Nat, Types.Transaction>(
      transactionEntries.vals(),
      transactionEntries.size(),
      Nat.equal,
      Utils.natHash,
    );

    boostRequestEntries := [];
    transactionEntries := [];
    state.nextBoostId := nextBoostId;
  };

  // Provider Management
  public shared(msg) func registerProvider() : async Result.Result<Types.LiquidityProvider, Text> {
    // limit provider registration to racif-2ns2g-himer-ehzmk-q3sxc-emyrr-ozvkf-76gvp-fmuhk-lkrlq-yae for now 
    if (msg.caller != Principal.fromText("racif-2ns2g-himer-ehzmk-q3sxc-emyrr-ozvkf-76gvp-fmuhk-lkrlq-yae")) {
      return #err("Provider registration is currently limited to specific principals.");
    };
    providerManager.registerProvider(msg.caller)
  };

  public shared(msg) func addLiquidity(args: Types.AddLiquidityArgs) : async Result.Result<Types.Transaction, Text> {
    if (msg.caller != Principal.fromText("racif-2ns2g-himer-ehzmk-q3sxc-emyrr-ozvkf-76gvp-fmuhk-lkrlq-yae")) {
      return #err("Provider registration is currently limited to specific principals.");
    };
    await providerManager.addLiquidity(msg.caller, args)
  };

  public shared(msg) func withdrawLiquidity(args: Types.WithdrawLiquidityArgs) : async Result.Result<Types.Transaction, Text> {
    if (msg.caller != Principal.fromText("racif-2ns2g-himer-ehzmk-q3sxc-emyrr-ozvkf-76gvp-fmuhk-lkrlq-yae")) {
      return #err("Provider registration is currently limited to specific principals.");
    };
    await providerManager.withdrawLiquidity(msg.caller, args)
  };

  // Boost Request Management
  public shared(msg) func registerBoostRequest(args: Types.RegisterBoostRequestArgs) : async Result.Result<Types.BoostRequest, Text> {
    await boostRequestManager.registerBoostRequest(msg.caller, args)
  };

  // Query Functions
  public query func getProvider(provider: Principal) : async ?Types.LiquidityProvider {
    providerManager.getProvider(provider)
  };

  public query func getAllProviders() : async [Types.LiquidityProvider] {
    providerManager.getAllProviders()
  };

  public query func getBoostRequest(id: Types.BoostId) : async ?Types.BoostRequest {
    state.boostRequests.get(id)
  };

  public query func getTransaction(id: Nat) : async ?Types.Transaction {
    state.getTransaction(id)
  };

  public query func getTransactionsByProvider(provider: Principal) : async [Types.Transaction] {
    state.getTransactionsByProvider(provider)
  };

  // Query functions for boost requests
  public query func getBoostRequestsByProvider(provider: Principal) : async [Types.BoostRequest] {
    boostRequestManager.getBoostRequestsByProvider(provider)
  };

  public query func getBoostRequestsByStatus(status: Types.BoostStatus) : async [Types.BoostRequest] {
    boostRequestManager.getBoostRequestsByStatus(status)
  };

  public query func getPendingBoostRequestsForProvider(provider: Principal) : async [Types.BoostRequest] {
    boostRequestManager.getPendingBoostRequestsForProvider(provider)
  };

  public query func getBoostRequestsByProviderAndStatus(provider: Principal, status: Types.BoostStatus) : async [Types.BoostRequest] {
    boostRequestManager.getBoostRequestsByProviderAndStatus(provider, status)
  };
}