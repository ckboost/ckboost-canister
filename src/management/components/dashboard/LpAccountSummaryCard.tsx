import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { 
  Coins, 
  RefreshCw, 
  Plus, 
  ArrowDownLeft, 
  HelpCircle, 
  Info
} from "lucide-react";
import { Principal } from "@dfinity/principal";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../backend/declarations/backend.did.js"; // Adjusted path
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useAuth } from "../../lib/auth-context"; // Corrected path

// --- Copied Definitions --- 
const CKBTC_LEDGER_CANISTER_ID = "mc6ru-gyaaa-aaaar-qaaaq-cai";
const BACKEND_CANISTER_ID = "75egi-7qaaa-aaaao-qj6ma-cai";

const icrc1LedgerIDLFactory = ({ IDL }: { IDL: any }) => {
  const Account = IDL.Record({
    'owner': IDL.Principal,
    'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const Tokens = IDL.Nat;
  // ... rest of IDL factory definition (balance_of needed)
  return IDL.Service({
    'icrc1_balance_of': IDL.Func([Account], [Tokens], ['query']),
    // Transfer not needed in this component
  });
};
// --- End Copied Definitions --- 

// Skeleton component for pool loading state
const PoolSkeleton = () => (
  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 animate-pulse">
    {/* ... skeleton structure ... */}
    <div className="flex justify-between items-start mb-3">
      <div>
        <div className="h-6 w-24 bg-gray-700/50 rounded mb-2"></div>
        <div className="h-4 w-16 bg-gray-700/30 rounded"></div>
      </div>
      <div className="h-8 w-20 bg-blue-900/30 rounded"></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="h-4 w-16 bg-gray-700/30 rounded mb-2"></div>
        <div className="h-4 w-24 bg-gray-700/50 rounded"></div>
      </div>
      <div>
        <div className="h-4 w-16 bg-gray-700/30 rounded mb-2"></div>
        <div className="h-4 w-24 bg-blue-700/30 rounded"></div>
      </div>
    </div>
  </div>
);

interface LpAccountSummaryCardProps {
  user: any;
  initialIsLoading: boolean;
  onRefresh: () => void; // Function to trigger refresh in parent if needed
  onShowDepositModal: () => void;
  onShowWithdrawModal: () => void;
  setError: (error: string | null) => void; 
  setSuccessMessage: (message: string | null) => void;
  onAccountUpdate?: (account: any | null) => void; // Add account update callback
}

export function LpAccountSummaryCard({
  user,
  initialIsLoading,
  onRefresh, 
  onShowDepositModal,
  onShowWithdrawModal,
  setError,
  setSuccessMessage,
  onAccountUpdate // Destructure callback
}: LpAccountSummaryCardProps) {
  const [boosterAccount, setBoosterAccount] = useState<any>(null);
  const [isAccountLoading, setIsAccountLoading] = useState(initialIsLoading);
  const [isRegisteringAccount, setIsRegisteringAccount] = useState(false);
  const { identity } = useAuth(); // Get identity from context

  // Update boosterAccount state and call callback
  const updateBoosterAccount = (account: any | null) => {
      setBoosterAccount(account);
      onAccountUpdate?.(account);
  }

  // Fetch booster account logic (moved from parent)
  const fetchBoosterAccount = async () => {
    if (!user) return;
    
    setIsAccountLoading(true);
    // Use passed setError to clear parent errors on refresh
    setError(null); 
    try {
      const backendActor = Actor.createActor(
        idlFactory,
        {
          agent: new HttpAgent({ host: "https://icp0.io" }),
          canisterId: Principal.fromText(BACKEND_CANISTER_ID)
        }
      );
      const accountResponse = await backendActor.getBoosterAccount(Principal.fromText(user.principal));
      
      if ((accountResponse as any[]).length > 0) {
        const accountData = (accountResponse as any[])[0];
        const ckBTCLedgerActor = Actor.createActor(
          icrc1LedgerIDLFactory,
          {
            agent: new HttpAgent({ host: "https://icp0.io" }),
            canisterId: Principal.fromText(CKBTC_LEDGER_CANISTER_ID)
          }
        );
        try {
          const balanceResponse: BigInt = await ckBTCLedgerActor.icrc1_balance_of({
            owner: Principal.fromText(BACKEND_CANISTER_ID),
            subaccount: [accountData.subaccount]
          }) as BigInt;
          const balanceInCkBTC = Number(balanceResponse) / 10 ** 8;
          updateBoosterAccount({ ...accountData, actualBalance: balanceInCkBTC });
        } catch (balanceError) {
          console.error("Error fetching booster account balance:", balanceError);
          updateBoosterAccount(accountData); // Use updater function
        }
      } else {
        updateBoosterAccount(null); // Use updater function
      }
    } catch (error) {
      console.error("Error fetching booster account:", error);
      setError("Failed to fetch booster account. Please try again.");
      updateBoosterAccount(null); // Ensure state is updated on error
    } finally {
      setIsAccountLoading(false);
    }
  };

  // Register account logic (moved from parent)
  const handleRegisterAccount = async () => {
    // Check identity from context
    if (!identity) { 
      setError("Identity not available. Please connect wallet.");
      return;
    }
    
    setIsRegisteringAccount(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Use identity from context as agent config
      const backendActor = Actor.createActor(
        idlFactory,
        { agent: identity, canisterId: Principal.fromText(BACKEND_CANISTER_ID) }
      );
      const result = await backendActor.registerBoosterAccount();
      
      if ('ok' in (result as any)) {
        setSuccessMessage("Successfully registered as a booster!");
        await fetchBoosterAccount(); // This will call updateBoosterAccount
        onRefresh(); // Notify parent if needed
      } else if ('err' in (result as any)) {
        setError((result as any).err as string);
      }
    } catch (error) {
      console.error("Error registering booster account:", error);
      setError("Failed to register as a booster. Please try again.");
    } finally {
      setIsRegisteringAccount(false);
    }
  };

  // Fetch account when user is available
  useEffect(() => {
    if (user) {
      fetchBoosterAccount();
    }
  }, [user]);

  // Handle local refresh click
  const handleRefreshClick = () => {
     fetchBoosterAccount();
     // Optionally call parent onRefresh if it needs to do more
     // onRefresh();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="lg:col-span-2"
    >
      <Card className="relative backdrop-blur-md overflow-hidden shadow-xl border-gray-800/50 h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 -z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 -z-10"></div>
        
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Your Booster Account</h2>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefreshClick} // Use local refresh
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
              disabled={isAccountLoading}
            >
              {isAccountLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {isAccountLoading ? (
            <div className="space-y-4">
              <PoolSkeleton />
            </div>
          ) : !boosterAccount ? (
            <div className="text-center py-8">
              {/* ... Registration prompt ... */}
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-900/20 flex items-center justify-center mb-4">
                <img src="/bitcoin-btc-logo.png" alt="ckBTC Logo" className="h-8 w-8" />
              </div>
              <p className="text-gray-400">You don't have a booster account yet.</p>
              <p className="text-gray-500 text-sm mt-2">Register below to start boosting.</p>
              <div className="mt-8">
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 py-5 text-base px-8 rounded-xl"
                  onClick={handleRegisterAccount}
                  disabled={!identity || isRegisteringAccount}
                >
                  {isRegisteringAccount ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Registering...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Register as a Booster
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg overflow-hidden border border-gray-700/50 shadow-lg">
              {/* ... Account details header ... */}
              <div className="p-4 border-b border-gray-700/50">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-blue-500/30">
                      <img src="/bitcoin-btc-logo.png" alt="ckBTC Logo" className="h-5 w-5"/>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-white">Booster Account</p>
                      <p className="text-sm text-gray-400">Owner: {user?.principal.slice(0, 5)}...{user?.principal.slice(-5)}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-6">
                  {/* Available Balance */}
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDownLeft className="h-4 w-4 text-green-400" />
                      <p className="text-sm font-medium text-green-400">Available Liquidity</p> {/* Renamed label */}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-2xl font-bold text-white">
                        {/* Use boosterAccount data */}
                        {(boosterAccount.actualBalance !== undefined 
                          ? boosterAccount.actualBalance 
                          : Number(boosterAccount.availableBalance || 0) / 10**8).toFixed(8)} 
                        <span className="text-gray-400 text-sm">ckBTC</span>
                      </p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-60 text-xs">
                              This is the amount of ckBTC in your booster account, available for boosting transactions.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                
                  {/* Boost Info Box */}
                  <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4 flex gap-3">
                    <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-300 font-medium">Boost Information</p>
                      <p className="text-xs text-blue-200/70 mt-1">
                        Your deposited ckBTC is available for boosting transactions on the network. 
                        When users request a boost, they'll be matched with boosters like you. 
                        You'll earn fees from each transaction that uses your ckBTC.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 py-5 text-base rounded-xl"
                    onClick={onShowDepositModal} // Use passed prop
                  >
                    <ArrowDownLeft className="h-5 w-5 mr-2" />
                    Deposit ckBTC
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-600/20 py-5 text-base rounded-xl"
                    onClick={onShowWithdrawModal} // Use passed prop
                    disabled={!boosterAccount.availableBalance || Number(boosterAccount.availableBalance || 0) === 0}
                  >
                    <ArrowDownLeft className="h-5 w-5 mr-2 rotate-180" />
                    Withdraw ckBTC
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
} 