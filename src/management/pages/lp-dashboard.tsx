import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { idlFactory } from "../declarations/backend.did.js";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";

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
    'GenericError': IDL.Record({
      'message': IDL.Text,
      'error_code': IDL.Nat,
    }),
    'TemporarilyUnavailable': IDL.Null,
    'BadBurn': IDL.Record({ 'min_burn_amount': Tokens }),
    'Duplicate': IDL.Record({ 'duplicate_of': IDL.Nat }),
    'BadFee': IDL.Record({ 'expected_fee': Tokens }),
    'CreatedInFuture': IDL.Record({ 'ledger_time': Timestamp }),
    'TooOld': IDL.Null,
    'InsufficientFunds': IDL.Record({ 'balance': Tokens }),
  });
  const TransferResult = IDL.Variant({
    'Ok': IDL.Nat,
    'Err': TransferError,
  });
  return IDL.Service({
    'icrc1_balance_of': IDL.Func([Account], [Tokens], ['query']),
    'icrc1_transfer': IDL.Func([TransferArg], [TransferResult], []),
  });
};

// Define canister IDs as constants
const BACKEND_CANISTER_ID = "75egi-7qaaa-aaaao-qj6ma-cai";
const CKBTC_LEDGER_CANISTER_ID = "mc6ru-gyaaa-aaaar-qaaaq-cai";

// Skeleton component for loading state
const BalanceSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 w-24 bg-gray-700/50 rounded mb-1"></div>
    <div className="h-4 w-16 bg-gray-700/30 rounded"></div>
  </div>
);

// Skeleton component for pool loading state
const PoolSkeleton = () => (
  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 animate-pulse">
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


export function LpDashboardPage() {
  const { user } = useAuth();
  const agent = useAgent();
  const [ckbtcBalance, setCkBTCBalance] = useState<number>(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Booster account states
  const [boosterAccount, setBoosterAccount] = useState<any>(null);
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [isRegisteringAccount, setIsRegisteringAccount] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  
  // Fetch ckBTC balance
  const getCkBTCBalance = async () => {
    if (!user) {
      return;
    }
    try {
      if (agent) {
        const ckBTCLedgerActor = Actor.createActor(
          icrc1LedgerIDLFactory,
          {
            agent: new HttpAgent({
              host: "https://icp0.io",
            }),
            canisterId: Principal.fromText(CKBTC_LEDGER_CANISTER_ID)
          }
        );
        const balanceResponse: BigInt = await ckBTCLedgerActor.icrc1_balance_of({
          owner: Principal.fromText(user?.principal || ""),
          subaccount: []
        }) as BigInt;
        const balanceInCkBTC = Number(balanceResponse) / 10 ** 8;
        setCkBTCBalance(balanceInCkBTC);
      }
    } catch (error) {
      console.error("Error fetching ckBTC balance:", error);
      setError("Failed to fetch ckBTC balance. Please try again.");
    }
  };

  // Fetch booster account
  const fetchBoosterAccount = async () => {
    if (!user) return;
    
    setIsAccountLoading(true);
    try {
      // Create actor for backend canister
      const backendActor = Actor.createActor(
        idlFactory,
        {
          agent: new HttpAgent({
            host: "https://icp0.io",
          }),
          canisterId: Principal.fromText(BACKEND_CANISTER_ID)
        }
      );
      
      // Fetch user's booster account
      const accountResponse = await backendActor.getBoosterAccount(Principal.fromText(user.principal));
      
      if ((accountResponse as any[]).length > 0) {
        // If account exists, get the actual balance
        const boosterAccount = (accountResponse as any[])[0];
        
        // Create ckBTC ledger actor to fetch balance
        const ckBTCLedgerActor = Actor.createActor(
          icrc1LedgerIDLFactory,
          {
            agent: new HttpAgent({
              host: "https://icp0.io",
            }),
            canisterId: Principal.fromText(CKBTC_LEDGER_CANISTER_ID)
          }
        );
        
        try {
          // Get the balance for the booster account subaccount
          const balanceResponse: BigInt = await ckBTCLedgerActor.icrc1_balance_of({
            owner: Principal.fromText(BACKEND_CANISTER_ID),
            subaccount: [boosterAccount.subaccount]
          }) as BigInt;
          
          // Convert balance from satoshis to ckBTC
          const balanceInCkBTC = Number(balanceResponse) / 10 ** 8;
          
          // Add actual balance to the booster account
          setBoosterAccount({
            ...boosterAccount,
            actualBalance: balanceInCkBTC
          });
        } catch (error) {
          console.error("Error fetching booster account balance:", error);
          setBoosterAccount(boosterAccount);
        }
      } else {
        // No account exists
        setBoosterAccount(null);
      }
    } catch (error) {
      console.error("Error fetching booster account:", error);
      setError("Failed to fetch booster account. Please try again.");
    } finally {
      setIsAccountLoading(false);
    }
  };

  const fetchData = async () => {
    setIsBalanceLoading(true);
    setIsAccountLoading(true);
    try {
      await getCkBTCBalance();
      await fetchBoosterAccount();
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch data. Please try again.");
    } finally {
      setIsBalanceLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, agent]);


  // Register a new booster account
  const handleRegisterAccount = async () => {
    setIsRegisteringAccount(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Create actor for backend canister
      const backendActor = Actor.createActor(
        idlFactory,
        {
          agent,
          canisterId: Principal.fromText(BACKEND_CANISTER_ID)
        }
      );
      
      // Register a new booster account
      const result = await backendActor.registerBoosterAccount();
      
      console.log("register result", result);
      if ('ok' in (result as any)) {
        // Show success message
        setSuccessMessage("Successfully registered as a booster!");
        
        // Refresh booster account
        await fetchBoosterAccount();
      } else if ('err' in (result as any)) {
        setError((result as any).err as string);
        setSuccessMessage(null);
      }
    } catch (error) {
      console.error("Error registering booster account:", error);
      setError("Failed to register as a booster. Please try again.");
      setSuccessMessage(null);
    } finally {
      setIsRegisteringAccount(false);
    }
  };
  
  // Handle deposit to a booster account
  const handleDeposit = async () => {
    if (!boosterAccount || !depositAmount || parseFloat(depositAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    
    if (parseFloat(depositAmount) > ckbtcBalance) {
      setError(`Insufficient ckBTC balance`);
      return;
    }
    
    setIsDepositing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Create ckBTC ledger actor
      const ckBTCActor = Actor.createActor(
        icrc1LedgerIDLFactory,
        {
          agent,
          canisterId: CKBTC_LEDGER_CANISTER_ID,
        }
      );
      
      // Convert amount to satoshis (ckBTC's smallest unit)
      const amountSatoshis = BigInt(Math.floor(parseFloat(depositAmount) * 10 ** 8));
      
      // Get the canister principal
      const canisterPrincipal = Principal.fromText(BACKEND_CANISTER_ID);
      
      // Prepare transfer arguments
      const transferArgs = {
        to: {
          owner: canisterPrincipal,
          subaccount: [boosterAccount.subaccount],
        },
        fee: [BigInt(10)], // 10 satoshis fee
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        amount: amountSatoshis,
      };
      
      console.log("Depositing ckBTC to booster account with args:", {
        to: canisterPrincipal.toString(),
        subaccount: Array.from(boosterAccount.subaccount).map((b: any) => b.toString(16).padStart(2, '0')).join(''),
        amount: amountSatoshis.toString(),
        fee: "10",
      });
      
      // Execute transfer
      const response = await ckBTCActor.icrc1_transfer(transferArgs);
      
      if ('Ok' in (response as any)) {
        const transactionId = (response as any).Ok.toString();
        console.log("ckBTC deposit successful, transaction ID:", transactionId);
        
        // Show success message
        setSuccessMessage(`Successfully deposited ${depositAmount} ckBTC to your booster account`);
        setError(null);
        
        // Wait a moment for the transaction to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update the booster account on the backend
        const backendActor = Actor.createActor(
          idlFactory,
          {
            agent,
            canisterId: Principal.fromText(BACKEND_CANISTER_ID)
          }
        );
        
        // Call updateBoosterDeposit to update the deposit amount
        await backendActor.updateBoosterDeposit(
          Principal.fromText(user?.principal || ""),
          amountSatoshis
        );
        
        // Refresh balance and account
        await getCkBTCBalance();
        await fetchBoosterAccount();
        
        setDepositAmount("");
        setShowDepositModal(false);
      } else if ('Err' in (response as any)) {
        // Handle error
        const errorResponse = (response as any).Err;
        const errorType = Object.keys(errorResponse)[0];
        const errorDetails = errorResponse[errorType];
        throw new Error(`Transfer failed: ${errorType} - ${JSON.stringify(errorDetails)}`);
      } else {
        throw new Error("Unknown transfer response format");
      }
    } catch (error) {
      console.error("Error depositing to booster account:", error);
      setError(`Failed to deposit: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSuccessMessage(null);
    } finally {
      setIsDepositing(false);
    }
  };

  // Handle withdrawal from a booster account
  const handleWithdraw = async () => {
    if (!boosterAccount || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    
    const availableBalance = boosterAccount.actualBalance !== undefined 
      ? boosterAccount.actualBalance
      : Number(boosterAccount.availableBalance) / 10**8;
    
    // Check if user is trying to withdraw the maximum amount (account for the 10 satoshi fee)
    const isMaxWithdrawal = Math.abs(parseFloat(withdrawAmount) - availableBalance) < 0.00000001;
    
    // Make sure user has enough balance (accounting for fee if not max withdrawal)
    if (!isMaxWithdrawal && parseFloat(withdrawAmount) + 0.0000001 > availableBalance) {
      setError(`Insufficient available balance (must include 0.0000001 ckBTC fee)`);
      return;
    }
    
    setIsWithdrawing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Convert amount to satoshis (ckBTC's smallest unit)
      let amountSatoshis: bigint;
      
      // For max withdrawals, we need to ensure the full amount can be withdrawn
      // Otherwise, the user specifies the exact amount they want to receive
      if (isMaxWithdrawal) {
        // When withdrawing max, subtract the fee from the internal calculation
        // (backend will handle this)
        amountSatoshis = BigInt(Math.floor(parseFloat(withdrawAmount) * 10 ** 8));
      } else {
        // Normal withdrawal - user specifies amount to receive
        amountSatoshis = BigInt(Math.floor(parseFloat(withdrawAmount) * 10 ** 8));
      }
      
      // Create backend actor
      const backendActor = Actor.createActor(
        idlFactory,
        {
          agent,
          canisterId: Principal.fromText(BACKEND_CANISTER_ID)
        }
      );
      
      console.log("Withdrawing ckBTC from booster account:", {
        amount: amountSatoshis.toString(),
        isMaxWithdrawal
      });
      
      // Call the backend to execute the withdrawal
      const result = await backendActor.withdrawBoosterFunds(amountSatoshis);
      
      if ('ok' in (result as any)) {
        console.log("Withdrawal successful");
        
        // Show success message
        setSuccessMessage(`Successfully withdrew ${withdrawAmount} ckBTC from your booster account`);
        setError(null);
        
        // Refresh balance and account
        await getCkBTCBalance();
        await fetchBoosterAccount();
        
        setWithdrawAmount("");
        setShowWithdrawModal(false);
      } else if ('err' in (result as any)) {
        throw new Error((result as any).err);
      } else {
        throw new Error("Unknown response format");
      }
    } catch (error) {
      console.error("Error withdrawing from booster account:", error);
      setError(`Failed to withdraw: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSuccessMessage(null);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-950 via-blue-950/20 to-gray-950">
      {/* Animated background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
      
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-10 md:py-16 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col items-center">
              <div className="mb-4 flex items-center justify-center">
                <img 
                  src="/internet-computer-icp-logo.png" 
                  alt="Internet Computer Logo" 
                  className="h-12 w-12 mb-2"
                />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 text-center">
                Become a Booster
              </h1>
              <p className="text-gray-400 text-center mt-2">
                Provide ckBTC liquidity to the network and earn fees
              </p>
            </div>
          </motion.div>

          {/* Success Message */}
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

          {/* Error Message */}
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

          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <Card className="relative backdrop-blur-md overflow-hidden shadow-xl border-gray-800/50">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 -z-10"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 -z-10"></div>
              
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Your ckBTC Balance</h2>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={fetchData}
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
                        <p className="text-sm text-gray-400">Available for providing liquidity</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Booster Account Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <Card className="relative backdrop-blur-md overflow-hidden shadow-xl border-gray-800/50">
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
                    onClick={fetchBoosterAccount}
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
                    <div className="mx-auto w-16 h-16 rounded-full bg-blue-900/20 flex items-center justify-center mb-4">
                      <img 
                        src="/bitcoin-btc-logo.png" 
                        alt="ckBTC Logo" 
                        className="h-8 w-8"
                      />
                    </div>
                    <p className="text-gray-400">You don't have a booster account yet.</p>
                    <p className="text-gray-500 text-sm mt-2">Register below to start boosting.</p>
                    
                    <div className="mt-8">
                      <Button 
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 py-5 text-base px-8 rounded-xl"
                        onClick={handleRegisterAccount}
                        disabled={isRegisteringAccount}
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
                    <div className="p-4 border-b border-gray-700/50">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-blue-500/30">
                            <img 
                              src="/bitcoin-btc-logo.png" 
                              alt="ckBTC Logo" 
                              className="h-5 w-5"
                            />
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
                            <p className="text-sm font-medium text-green-400">Available Balance</p>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <p className="text-2xl font-bold text-white">
                              {boosterAccount.actualBalance !== undefined 
                                ? boosterAccount.actualBalance.toFixed(8) 
                                : Number(boosterAccount.availableBalance) / 10**8} 
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

                      <div className="flex gap-3">
                        <Button 
                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 py-5 text-base rounded-xl"
                          onClick={() => setShowDepositModal(true)}
                        >
                          <ArrowDownLeft className="h-5 w-5 mr-2" />
                          Deposit ckBTC
                        </Button>
                        
                        <Button 
                          className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-600/20 py-5 text-base rounded-xl"
                          onClick={() => setShowWithdrawModal(true)}
                          disabled={!boosterAccount.availableBalance || boosterAccount.availableBalance === 0}
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
        </div>
      </main>
      
      <Footer />
      
      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <img src="/bitcoin-btc-logo.png" alt="ckBTC Logo" className="h-4 w-4" />
                  </div>
                  Deposit ckBTC to Your Account
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-gray-800"
                  onClick={() => setShowDepositModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label htmlFor="depositAmount" className="block text-sm font-medium text-blue-300">
                    Amount (ckBTC)
                  </label>
                  <div className="relative">
                    <Input
                      id="depositAmount"
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
                      Available: {isBalanceLoading ? "Loading..." : ckbtcBalance.toFixed(8)} ckBTC
                    </span>
                    <button 
                      type="button" 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={() => setDepositAmount(ckbtcBalance.toString())}
                      disabled={isDepositing || isBalanceLoading || ckbtcBalance === 0}
                    >
                      Max
                    </button>
                  </div>
                </div>
                
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
                
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 py-5 text-base rounded-xl"
                  onClick={handleDeposit}
                  disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0 || parseFloat(depositAmount) > ckbtcBalance}
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
              
              <div className="bg-gray-900/50 p-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 text-center">
                  You can withdraw your ckBTC from the account at any time, as long as it's not being used for boosting.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <img src="/bitcoin-btc-logo.png" alt="ckBTC Logo" className="h-4 w-4" />
                  </div>
                  Withdraw ckBTC from Your Account
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-gray-800"
                  onClick={() => setShowWithdrawModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label htmlFor="withdrawAmount" className="block text-sm font-medium text-blue-300">
                    Amount (ckBTC)
                  </label>
                  <div className="relative">
                    <Input
                      id="withdrawAmount"
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
                      Available: {isAccountLoading ? "Loading..." : (
                        boosterAccount ? 
                          (boosterAccount.actualBalance !== undefined 
                            ? boosterAccount.actualBalance.toFixed(8) 
                            : (Number(boosterAccount.availableBalance) / 10**8).toFixed(8)
                          ) 
                          : "0.00000000"
                      )} ckBTC
                    </span>
                    <button 
                      type="button" 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={() => {
                        if (boosterAccount) {
                          const availableBalance = boosterAccount.actualBalance !== undefined 
                            ? boosterAccount.actualBalance
                            : Number(boosterAccount.availableBalance) / 10**8;
                          setWithdrawAmount(availableBalance.toString());
                        }
                      }}
                      disabled={isWithdrawing || isAccountLoading || !boosterAccount || (boosterAccount && boosterAccount.availableBalance === 0)}
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
                      {withdrawAmount && parseFloat(withdrawAmount) > 0 
                        ? (() => {
                            const availableBalance = boosterAccount?.actualBalance !== undefined 
                              ? boosterAccount.actualBalance
                              : Number(boosterAccount?.availableBalance || 0) / 10**8;
                            
                            // Is this a max withdrawal?
                            const isMaxWithdrawal = Math.abs(parseFloat(withdrawAmount) - availableBalance) < 0.00000001;
                            
                            // For max withdrawals, we need to subtract the fee from the display amount
                            // Otherwise, the user specifies the amount they want to receive
                            if (isMaxWithdrawal) {
                              return Math.max(0, parseFloat(withdrawAmount) - 0.0000001).toFixed(8);
                            } else {
                              return parseFloat(withdrawAmount).toFixed(8);
                            }
                          })()
                        : "0.00000000"
                      } ckBTC
                    </span>
                  </div>
                </div>
                
                <div className="bg-orange-900/20 border border-orange-800/30 rounded-lg p-3 flex gap-2 items-start">
                  <Info className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-orange-300 font-medium">Withdrawal Information</p>
                    <p className="text-xs text-orange-200/70 mt-1">
                      You can withdraw your ckBTC from your booster account at any time, as long as it's not being used for active boosting.
                      A standard fee of 0.00000010 ckBTC will be deducted from your withdrawal. When clicking "Max", the system will automatically handle the fee calculation.
                    </p>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-600/20 py-5 text-base rounded-xl"
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || (boosterAccount && parseFloat(withdrawAmount) > (boosterAccount.actualBalance !== undefined ? boosterAccount.actualBalance : Number(boosterAccount.availableBalance) / 10**8))}
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
              
              <div className="bg-gray-900/50 p-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 text-center">
                  The withdrawn funds will be sent directly to your connected wallet.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
} 