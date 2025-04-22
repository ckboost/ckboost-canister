import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { RefreshCw } from "lucide-react";
import { Principal } from "@dfinity/principal";
import { Actor, HttpAgent } from "@dfinity/agent";

// --- Copied from lp-dashboard.tsx --- 
const CKBTC_LEDGER_CANISTER_ID = "mc6ru-gyaaa-aaaar-qaaaq-cai";

const BalanceSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 w-24 bg-gray-700/50 rounded mb-1"></div>
    <div className="h-4 w-16 bg-gray-700/30 rounded"></div>
  </div>
);
// --- End Copied section ---

interface WalletBalanceCardProps {
  user: { principal?: string } | null; // Pass user object
  onRefresh: () => void;
  initialIsLoading: boolean;
  onBalanceUpdate?: (balance: number) => void;
}

export function WalletBalanceCard({ 
  user, 
  onRefresh, 
  initialIsLoading, 
  onBalanceUpdate 
}: WalletBalanceCardProps) {
  const [ckbtcBalance, setCkBTCBalance] = useState<number>(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(initialIsLoading);
  const [error, setError] = useState<string | null>(null);

  const getCkBTCBalance = async () => {
    if (!user || !user.principal) {
        setError("User principal not available.");
        setIsBalanceLoading(false);
        return;
    }
    
    setError(null); // Clear previous errors
    setIsBalanceLoading(true);
    try {
        // Create actor with inline IDL and anonymous agent
        const ckBTCLedgerActor = Actor.createActor(
          ({ IDL }) => { // Inline IDL Factory
            const Account = IDL.Record({
              owner: IDL.Principal,
              subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
            });
            return IDL.Service({
              'icrc1_balance_of': IDL.Func([Account], [IDL.Nat], ['query'])
            });
          },
          {
            agent: new HttpAgent({ // Creates a NEW anonymous HttpAgent
              host: "https://icp0.io", // Explicitly targets mainnet
            }),
            canisterId: Principal.fromText(CKBTC_LEDGER_CANISTER_ID)
          }
        );
        
        // Fetch balance using user principal from props
        const balanceResponse: BigInt = await ckBTCLedgerActor.icrc1_balance_of({
          owner: Principal.fromText(user.principal), // Use principal from user prop
          subaccount: [] // Default subaccount
        }) as BigInt;
        
        const balanceInCkBTC = Number(balanceResponse) / 10 ** 8;
        setCkBTCBalance(balanceInCkBTC);
        onBalanceUpdate?.(balanceInCkBTC); // Update parent state

    } catch (err) {
      console.error("Error fetching ckBTC balance:", err);
      setError("Failed to fetch wallet balance.");
    } finally {
       setIsBalanceLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      getCkBTCBalance();
    }
    // Refetch might be triggered by parent via onRefresh prop
  }, [user]); // Re-fetch if user changes

  const handleRefreshClick = () => {
    getCkBTCBalance(); 
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="lg:col-span-1" 
    >
      <Card className="relative backdrop-blur-md overflow-hidden shadow-xl border-gray-800/50 h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 -z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 -z-10"></div>
        
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Your Wallet Balance</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefreshClick} // Use local refresh handler
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
              disabled={isBalanceLoading}
            >
              {isBalanceLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center border border-orange-500/30">
              <img 
                src="/bitcoin-btc-logo.png" 
                alt="ckBTC Logo" 
                className="h-6 w-6"
              />
            </div>
            <div>
              {isBalanceLoading ? (
                <BalanceSkeleton />
              ) : (
                <>
                  <p className="text-2xl font-bold text-white">{ckbtcBalance.toFixed(8)} <span className="text-gray-400 text-lg">ckBTC</span></p>
                  {/* Optional: Add subtext if needed */}
                  {/* <p className="text-sm text-gray-400">In your wallet</p> */}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 