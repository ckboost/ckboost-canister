import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { X, Info, AlertTriangle } from "lucide-react";
import { Principal } from "@dfinity/principal";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../backend/declarations/backend.did.js";
import { useAuth } from "../../lib/auth-context";

// --- Copied Definitions --- 
const BACKEND_CANISTER_ID = "75egi-7qaaa-aaaao-qj6ma-cai";
// --- End Copied Definitions ---

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  boosterAccount: any;
  onWithdrawalSuccess: () => void; // Callback after successful withdrawal
}

export function WithdrawalModal({ 
  isOpen, 
  onClose, 
  user, 
  boosterAccount, 
  onWithdrawalSuccess 
}: WithdrawalModalProps) {
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { identity } = useAuth();

  // Calculate available balance safely
  const availableBalance = boosterAccount?.actualBalance !== undefined 
    ? boosterAccount.actualBalance
    : Number(boosterAccount?.availableBalance || 0) / 10**8;

  useEffect(() => {
    if (!isOpen) {
      setWithdrawAmount("");
      setIsWithdrawing(false);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const handleWithdraw = async () => {
    if (!identity) { 
      setError("Identity not available. Please connect wallet.");
      return;
    }
    if (!boosterAccount || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const isMaxWithdrawal = Math.abs(parseFloat(withdrawAmount) - availableBalance) < 0.00000001;
    
    if (!isMaxWithdrawal && parseFloat(withdrawAmount) + 0.0000001 > availableBalance) {
      setError(`Insufficient available balance (must include 0.0000001 ckBTC fee)`);
      return;
    }
    if (parseFloat(withdrawAmount) > availableBalance) {
        setError("Withdrawal amount cannot exceed available balance.");
        return;
    }
    
    setIsWithdrawing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      let amountSatoshis: bigint;
      if (isMaxWithdrawal) {
        // Backend handles max withdrawal logic, send the displayed max amount
         amountSatoshis = BigInt(Math.floor(availableBalance * 10 ** 8));
      } else {
        // User specifies amount to receive, backend deducts fee
        amountSatoshis = BigInt(Math.floor(parseFloat(withdrawAmount) * 10 ** 8));
      }
      
      const backendActor = Actor.createActor(
        idlFactory,
        { agent: identity, canisterId: Principal.fromText(BACKEND_CANISTER_ID) }
      );
      
      const result = await backendActor.withdrawBoosterFunds(amountSatoshis);
      
      if ('ok' in (result as any)) {
        setSuccessMessage(`Successfully initiated withdrawal of ${withdrawAmount} ckBTC.`);
        setError(null);
        await new Promise(resolve => setTimeout(resolve, 1500));
        onWithdrawalSuccess(); // Refresh parent
        onClose(); // Close modal
      } else if ('err' in (result as any)) {
        throw new Error((result as any).err);
      } else {
        throw new Error("Unknown response format from withdrawBoosterFunds");
      }
    } catch (err) {
      console.error("Error withdrawing from booster account:", err);
      setError(`Failed to withdraw: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSuccessMessage(null);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const amountToReceive = () => {
      if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return "0.00000000";
      const amount = parseFloat(withdrawAmount);
      if (amount > availableBalance) return "0.00000000"; // Prevent showing negative
      const isMaxWithdrawal = Math.abs(amount - availableBalance) < 0.00000001;
      // For max withdrawals, the displayed receive amount already accounts for the fee
      // because the user clicked max on the available amount which is what they get minus fee.
      // For specific amounts, that is the amount they receive.
      if (isMaxWithdrawal) {
           // Backend subtracts the fee from the `availableBalance` implicitly when called with max amount
          return Math.max(0, availableBalance - 0.0000001).toFixed(8);
      } else {
          return amount.toFixed(8);
      }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full overflow-hidden"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <img src="/bitcoin-btc-logo.png" alt="ckBTC Logo" className="h-4 w-4" />
                </div>
                Withdraw ckBTC from Your Account
              </h3>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-gray-800" onClick={onClose} disabled={isWithdrawing}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6">
                {/* Error Message */} 
                {error && (
                    <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3 flex gap-2 items-center">
                        <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                        <p className="text-red-300 text-sm font-medium">{error}</p>
                    </div>
                )}
                 {/* Success Message */} 
                 {successMessage && (
                    <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-3 flex gap-2 items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <p className="text-green-300 text-sm font-medium">{successMessage}</p>
                    </div>
                )}

                {/* Amount Input */}
                <div className="space-y-2">
                  <label htmlFor="withdrawAmountModal" className="block text-sm font-medium text-blue-300">
                    Withdrawal Amount (ckBTC)
                  </label>
                  <div className="relative">
                    <Input
                      id="withdrawAmountModal"
                      type="number"
                      step="0.00000001"
                      min="0.00000001"
                      placeholder="0.00000001"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="pl-4 pr-16 border-gray-700/50 bg-gray-800/50 focus:border-blue-500 focus:ring-blue-500/50 h-12 rounded-lg"
                      disabled={isWithdrawing}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <span className="text-gray-400 font-medium">ckBTC</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">
                      Available: {availableBalance.toFixed(8)} ckBTC
                    </span>
                    <button 
                      type="button" 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={() => setWithdrawAmount(availableBalance.toString())}
                      disabled={isWithdrawing || availableBalance === 0}
                    >
                      Max
                    </button>
                  </div>
                </div>
                
                {/* Fee notice */} 
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Withdrawal Fee:</span>
                    <span className="text-sm font-medium text-white">0.00000010 ckBTC</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">You Will Receive:</span>
                    <span className="text-sm font-medium text-green-400">
                      {amountToReceive()} ckBTC
                    </span>
                  </div>
                </div>
                
                {/* Info Box */}
                <div className="bg-orange-900/20 border border-orange-800/30 rounded-lg p-3 flex gap-2 items-start">
                  <Info className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-orange-300 font-medium">Withdrawal Information</p>
                    <p className="text-xs text-orange-200/70 mt-1">
                      You can withdraw your ckBTC from your booster account at any time, as long as it's not being used for active boosting.
                      A standard fee of 0.00000010 ckBTC will be deducted. When clicking "Max", the fee is accounted for in the amount sent to the backend.
                    </p>
                  </div>
                </div>
                
                {/* Action Button - Disable if identity isn't available */}
                <Button 
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-600/20 py-5 text-base rounded-xl"
                  onClick={handleWithdraw}
                  disabled={!identity || isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > availableBalance}
                >
                  {isWithdrawing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Withdrawing...
                    </span>
                  ) : (
                    <span>Withdraw ckBTC</span>
                  )}
                </Button>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-900/50 p-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 text-center">
                The withdrawn funds will be sent directly to your connected wallet.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 