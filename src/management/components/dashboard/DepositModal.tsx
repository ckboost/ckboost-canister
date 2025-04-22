import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { X, Info, AlertTriangle } from "lucide-react";
import { Principal } from "@dfinity/principal";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory as backendIdlFactory } from "../../../backend/declarations/backend.did.js";

// --- Copied Definitions --- 
const CKBTC_LEDGER_CANISTER_ID = "mc6ru-gyaaa-aaaar-qaaaq-cai";
const BACKEND_CANISTER_ID = "75egi-7qaaa-aaaao-qj6ma-cai";

// Minimal ICRC1 IDL for transfer
const icrc1LedgerIDLFactory = ({ IDL }: { IDL: any }) => {
  const Account = IDL.Record({
    'owner': IDL.Principal,
    'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const Tokens = IDL.Nat;
  const Memo = IDL.Vec(IDL.Nat8);
  const Timestamp = IDL.Nat64;
  const TransferArg = IDL.Record({
    'to': Account,
    'fee': IDL.Opt(Tokens),
    'memo': IDL.Opt(Memo),
    'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time': IDL.Opt(Timestamp),
    'amount': Tokens,
  });
  const TransferError = IDL.Variant({
    'GenericError': IDL.Record({ 'message': IDL.Text, 'error_code': IDL.Nat }),
    'TemporarilyUnavailable': IDL.Null,
    'BadBurn': IDL.Record({ 'min_burn_amount': Tokens }),
    'Duplicate': IDL.Record({ 'duplicate_of': IDL.Nat }),
    'BadFee': IDL.Record({ 'expected_fee': Tokens }),
    'CreatedInFuture': IDL.Record({ 'ledger_time': Timestamp }),
    'TooOld': IDL.Null,
    'InsufficientFunds': IDL.Record({ 'balance': Tokens }),
  });
  const TransferResult = IDL.Variant({ 'Ok': IDL.Nat, 'Err': TransferError });
  return IDL.Service({
    'icrc1_transfer': IDL.Func([TransferArg], [TransferResult], []),
  });
};
// --- End Copied Definitions ---

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  agent: any;
  boosterAccount: any;
  walletCkbtcBalance: number;
  onDepositSuccess: () => void; // Callback after successful deposit
}

export function DepositModal({ 
  isOpen, 
  onClose, 
  user, 
  agent, 
  boosterAccount, 
  walletCkbtcBalance, 
  onDepositSuccess 
}: DepositModalProps) {
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // Local success/error for modal

  useEffect(() => {
    // Reset state when modal opens/closes
    if (!isOpen) {
      setDepositAmount("");
      setIsDepositing(false);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const handleDeposit = async () => {
    if (!boosterAccount || !boosterAccount.subaccount || !depositAmount || parseFloat(depositAmount) <= 0) {
      setError("Please enter a valid amount and ensure your account is loaded.");
      return;
    }
    if (parseFloat(depositAmount) > walletCkbtcBalance) {
      setError(`Insufficient wallet balance.`);
      return;
    }
    
    setIsDepositing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const ckBTCActor = Actor.createActor(
        icrc1LedgerIDLFactory,
        { agent, canisterId: Principal.fromText(CKBTC_LEDGER_CANISTER_ID) }
      );
      
      const amountSatoshis = BigInt(Math.floor(parseFloat(depositAmount) * 10 ** 8));
      const canisterPrincipal = Principal.fromText(BACKEND_CANISTER_ID);
      
      const transferArgs = {
        to: { owner: canisterPrincipal, subaccount: [boosterAccount.subaccount] },
        fee: [BigInt(10)],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        amount: amountSatoshis,
      };
      
      const response = await ckBTCActor.icrc1_transfer(transferArgs);
      
      if ('Ok' in (response as any)) {
        const backendActor = Actor.createActor(
          backendIdlFactory,
          { agent, canisterId: Principal.fromText(BACKEND_CANISTER_ID) }
        );
        await backendActor.updateBoosterDeposit(
          Principal.fromText(user?.principal || ""),
          amountSatoshis
        );
        
        setSuccessMessage(`Successfully deposited ${depositAmount} ckBTC.`);
        setError(null);
        // Wait briefly before closing and refreshing parent
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        onDepositSuccess(); // Trigger parent refresh
        onClose(); // Close modal
      } else if ('Err' in (response as any)) {
        const errorResponse = (response as any).Err;
        const errorType = Object.keys(errorResponse)[0];
        const errorDetails = errorResponse[errorType];
        throw new Error(`Transfer failed: ${errorType} - ${JSON.stringify(errorDetails)}`);
      } else {
        throw new Error("Unknown transfer response format");
      }
    } catch (err) {
      console.error("Error depositing to booster account:", err);
      setError(`Failed to deposit: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSuccessMessage(null);
    } finally {
      setIsDepositing(false);
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
                Deposit ckBTC to Your Account
              </h3>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-gray-800" onClick={onClose} disabled={isDepositing}>
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
                <label htmlFor="depositAmountModal" className="block text-sm font-medium text-blue-300">
                  Amount (ckBTC)
                </label>
                <div className="relative">
                  <Input
                    id="depositAmountModal"
                    type="number"
                    step="0.00000001"
                    min="0.00000001"
                    placeholder="0.00000001"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="pl-4 pr-16 border-gray-700/50 bg-gray-800/50 focus:border-blue-500 focus:ring-blue-500/50 h-12 rounded-lg"
                    disabled={isDepositing}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-gray-400 font-medium">ckBTC</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">
                    Wallet Available: {walletCkbtcBalance.toFixed(8)} ckBTC
                  </span>
                  <button 
                    type="button" 
                    className="text-blue-400 hover:text-blue-300"
                    onClick={() => setDepositAmount(walletCkbtcBalance.toString())}
                    disabled={isDepositing || walletCkbtcBalance === 0}
                  >
                    Max
                  </button>
                </div>
              </div>
              
              {/* Info Box */}
              <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3 flex gap-2 items-start">
                <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-300 font-medium">Deposit Information</p>
                  <p className="text-xs text-blue-200/70 mt-1">
                    Depositing ckBTC to your booster account makes it available for boosting transactions.
                    You'll earn fees when your deposited ckBTC is used to boost transactions.
                  </p>
                </div>
              </div>
              
              {/* Action Button */}
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 py-5 text-base rounded-xl"
                onClick={handleDeposit}
                disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0 || parseFloat(depositAmount) > walletCkbtcBalance}
              >
                {isDepositing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Depositing...
                  </span>
                ) : (
                  <span>Deposit ckBTC</span>
                )}
              </Button>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-900/50 p-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 text-center">
                A fee of 10 satoshis (0.00000010 ckBTC) will be applied by the ckBTC ledger.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 