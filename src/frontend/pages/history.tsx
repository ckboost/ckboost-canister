import React from 'react';
import { motion } from "framer-motion";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { useAuth } from "../lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory, _SERVICE, BoostRequest } from "../../backend/declarations/backend.did.js";
import { Button } from "../components/ui/button";
import { RefreshCw, AlertCircle, CheckCircle, Clock, AlertTriangle, Copy } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";

// Assume BACKEND_CANISTER_ID is available (e.g., from env or constants)
const BACKEND_CANISTER_ID = process.env.CANISTER_ID_BACKEND || "75egi-7qaaa-aaaao-qj6ma-cai"; 

// Actor for query calls (anonymous)
const createActor = () => {
  const agent = new HttpAgent({ host: "https://icp0.io" });
  return Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: Principal.fromText(BACKEND_CANISTER_ID)
  });
};

// Helper to format status
const formatStatus = (status: any): { text: string; icon: React.ReactNode; color: string } => {
  // Check for the key within the status object
  if ('pending' in status) return { text: "Pending", icon: <Clock className="h-4 w-4" />, color: "text-yellow-400" };
  if ('active' in status) return { text: "Active", icon: <RefreshCw className="h-4 w-4 animate-spin" />, color: "text-blue-400" };
  if ('completed' in status) return { text: "Completed", icon: <CheckCircle className="h-4 w-4" />, color: "text-green-400" };
  if ('cancelled' in status) return { text: "Cancelled", icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-400" };
  // Default/fallback case
  return { text: "Unknown", icon: <AlertCircle className="h-4 w-4" />, color: "text-gray-400" };
};

// Helper to format timestamps (optional)
const formatTimestamp = (timestamp: bigint): string => {
  try {
    // Convert nanoseconds bigint to milliseconds number
    const milliseconds = Number(timestamp / 1_000_000n);
    return new Date(milliseconds).toLocaleString();
  } catch (e) {
    return "Invalid Date";
  }
};

export function HistoryPage() {
  const { user, isAuthenticated } = useAuth();

  const { data: userRequests, isLoading, error, refetch } = useQuery<BoostRequest[], Error>({
    queryKey: ['userBoostRequests', user?.principal], 
    queryFn: async () => {
      if (!user?.principal) throw new Error("User principal not available");
      const actor = createActor();
      const principal = Principal.fromText(user.principal);
      const history = await actor.getUserBoostRequests(principal);
      console.log(history);
      return history;
    },
    enabled: !!isAuthenticated && !!user?.principal, 
    refetchInterval: 60000, 
  });

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    // Consider adding toast notifications for feedback
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-950 via-blue-950/20 to-gray-950">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 md:py-16 relative">
        <div className="max-w-6xl mx-auto">
          {/* Header section */}
          <motion.div
            className="flex justify-between items-center mb-8"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                Your Boost History
              </h1>
              <p className="text-gray-400 mt-2">View the status and details of your past boost requests.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </motion.div>

          {/* Table Section */}
          <Card className="relative backdrop-blur-md overflow-hidden shadow-xl border-gray-800/50">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 -z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 -z-10"></div>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center min-h-[200px]">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-400"/>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center min-h-[200px] text-red-400">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>Error fetching requests: {error.message}</p>
                    <Button variant="link" onClick={() => refetch()} className="mt-2 text-blue-400">Try Again</Button>
                </div>
              ) : !isLoading && !error && (!userRequests || !Array.isArray(userRequests) || userRequests.length === 0) ? (
                <div className="flex justify-center items-center min-h-[200px]">
                  <p className="text-gray-400">You haven't made any boost requests yet.</p>
                </div>
              ) : !isLoading && !error && Array.isArray(userRequests) ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-300 uppercase bg-gray-800/60">
                      <tr>
                        <th scope="col" className="px-6 py-3">Created At</th>
                        <th scope="col" className="px-6 py-3">Deposit Address</th>
                        <th scope="col" className="px-6 py-3">Amount (ckBTC)</th>
                        <th scope="col" className="px-6 py-3">Fee (%)</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userRequests.sort((a: BoostRequest, b: BoostRequest) => Number(b.createdAt - a.createdAt))
                       .map((request: BoostRequest) => {
                        const statusInfo = formatStatus(request.status);
                        return (
                          <tr key={request.id.toString()} className="border-b border-gray-700/50 hover:bg-gray-800/40">
                            <td className="px-6 py-4 text-gray-400 text-xs whitespace-nowrap">
                              {formatTimestamp(request.createdAt)}
                            </td>
                            <td className="px-6 py-4 text-gray-300 font-mono text-xs">
                              {(() => { 
                                const address = request.btcAddress?.[0];
                                if (address) { 
                                  return (
                                    <div className="flex items-center gap-2 max-w-[200px]">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger className="truncate cursor-default">
                                            {address!}
                                          </TooltipTrigger>
                                          <TooltipContent><p>{address!}</p></TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full text-gray-400 hover:text-white hover:bg-gray-700" onClick={() => handleCopyAddress(address)}>
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  );
                                } else {
                                  return <span className="text-gray-500">N/A</span>;
                                }
                              })()}
                            </td>
                            <td className="px-6 py-4 text-gray-300">{(Number(request.amount) / 10**8).toFixed(8)}</td>
                            <td className="px-6 py-4 text-gray-300">{request.maxFeePercentage.toFixed(2)}%</td>
                            <td className={`px-6 py-4 font-medium ${statusInfo.color}`}>
                              <div className="flex items-center gap-2">
                                {statusInfo.icon}
                                <span>{statusInfo.text}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
} 