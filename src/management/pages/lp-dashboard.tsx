import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useEffect } from "react";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Principal } from "@dfinity/principal";
import { Actor, HttpAgent } from "@dfinity/agent";
import { useAuth } from "../lib/auth-context";
import { useAgent } from "@nfid/identitykit/react";
import { 
  Plus, 
  Info, 
  RefreshCw,
  HelpCircle,
  X,
  ArrowDownLeft,  
  Coins,
  AlertTriangle
} from "lucide-react";
import { idlFactory } from "../../backend/declarations/backend.did.js";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { WalletBalanceCard } from "../components/dashboard/WalletBalanceCard";
import { LpAccountSummaryCard } from "../components/dashboard/LpAccountSummaryCard";
import { DepositModal } from "../components/dashboard/DepositModal";
import { WithdrawalModal } from "../components/dashboard/WithdrawalModal";

export function LpDashboardPage() {
  const { user } = useAuth();
  const [walletCkbtcBalance, setWalletCkbtcBalance] = useState<number>(0);
  const [currentBoosterAccount, setCurrentBoosterAccount] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  
  const [isInitialDataLoading, setIsInitialDataLoading] = useState(true);
  
  const refreshAllData = () => {
    setIsInitialDataLoading(true);
    setError(null); 
    console.log("Refreshing data..."); 
    setIsInitialDataLoading(false); 
  };

  useEffect(() => {
    setIsInitialDataLoading(true);
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-950 via-blue-950/20 to-gray-950">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
      
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-10 md:py-16 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 text-left mb-2">
              LP Dashboard
              </h1>
            <p className="text-gray-400 text-left text-lg">
              Manage your liquidity, monitor performance, and view boost requests.
              </p>
          </motion.div>

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4 flex gap-3 items-center">
                <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-green-300 font-medium">{successMessage}</p>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4 flex gap-3 items-center">
                <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <p className="text-red-300 font-medium">{error}</p>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <WalletBalanceCard 
              user={user}
              onRefresh={refreshAllData}
              initialIsLoading={isInitialDataLoading}
              onBalanceUpdate={setWalletCkbtcBalance}
            />

            <LpAccountSummaryCard
              user={user}
              initialIsLoading={isInitialDataLoading}
              onRefresh={refreshAllData}
              onShowDepositModal={() => setShowDepositModal(true)}
              onShowWithdrawModal={() => setShowWithdrawModal(true)}
              setError={setError}
              setSuccessMessage={setSuccessMessage}
              onAccountUpdate={setCurrentBoosterAccount}
            />

            <div className="lg:col-span-1 bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 min-h-[100px]">Pending Boosts (Placeholder)</div>
            <div className="lg:col-span-2 bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 min-h-[100px]">Transaction History (Placeholder)</div>
          </div>
        </div>
      </main>
      
      <Footer />
      
      <DepositModal 
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        user={user}
        boosterAccount={currentBoosterAccount}
        walletCkbtcBalance={walletCkbtcBalance}
        onDepositSuccess={refreshAllData}
      />
      
      <WithdrawalModal 
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        user={user}
        boosterAccount={currentBoosterAccount}
        onWithdrawalSuccess={refreshAllData}
      />
    </div>
  );
} 