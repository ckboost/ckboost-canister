import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { useAuth } from "../lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory, _SERVICE, BoostRequest } from "../../backend/declarations/backend.did.js"; // Corrected path
import { Button } from "../components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";

const BACKEND_CANISTER_ID = "75egi-7qaaa-aaaao-qj6ma-cai"; // Consider moving to constants

// Function to create the backend actor
const createActor = (identity?: any) => {
  const agent = new HttpAgent({
    host: "https://icp0.io",
    identity // Use provided identity for update calls
  });
  return Actor.createActor<_SERVICE>(idlFactory, { 
    agent, 
    canisterId: Principal.fromText(BACKEND_CANISTER_ID) 
  });
};

export function PendingBoostsPage() {
  const { isAuthenticated, identity } = useAuth(); // Get identity for mutation actor
  const queryClient = useQueryClient(); // Get query client for invalidation

  // Local state for mutation feedback
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationSuccess, setMutationSuccess] = useState<string | null>(null);

  // Fetch pending requests using React Query
  const { data: pendingRequests, isLoading, error: queryError, refetch } = useQuery<BoostRequest[], Error>({
    queryKey: ['pendingBoostRequests'],
    queryFn: async () => {
      const actor = createActor();
      return await actor.getPendingBoostRequests();
    },
    enabled: isAuthenticated, // Only fetch if authenticated
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mutation for accepting a boost request
  const acceptBoostMutation = useMutation<Result.Result<Text, Text>, Error, bigint>({
    mutationFn: async (boostId: bigint) => {
      const actor = createActor(identity); // Use identity for update call
      return await actor.acceptBoostRequest(boostId);
    },
    onSuccess: (result, boostId) => {
      if ('ok' in result) {
        setMutationSuccess(`Successfully accepted boost request ${boostId.toString()}.`);
        setMutationError(null);
        // Invalidate the query to refetch the list
        queryClient.invalidateQueries({ queryKey: ['pendingBoostRequests'] });
      } else {
        // Handle #err case from backend result
        setMutationError(`Failed to accept boost ${boostId.toString()}: ${result.err}`);
        setMutationSuccess(null);
      }
    },
    onError: (error, boostId) => {
      // Handle network/fetch errors
      setMutationError(`Network error accepting boost ${boostId.toString()}: ${error.message}`);
      setMutationSuccess(null);
    },
  });

  const handleAcceptBoost = (boostId: bigint) => {
    setMutationError(null); // Clear previous errors before new mutation
    setMutationSuccess(null);
    acceptBoostMutation.mutate(boostId);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-950 via-blue-950/20 to-gray-950">
      {/* Animated background elements (optional) */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>
      
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-10 md:py-16 relative">
        <div className="max-w-6xl mx-auto">
          {/* Header section */}
          <motion.div
            className="flex justify-between items-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 text-left">
                Pending Boost Requests
              </h1>
              <p className="text-gray-400 text-left mt-2">
                Review and manage incoming boost requests requiring liquidity.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </motion.div>

          {/* Display Mutation Feedback */} 
          {mutationError && (
            <motion.div className="mb-4 p-3 text-sm text-red-300 bg-red-900/30 border border-red-800/50 rounded-lg">
              {mutationError}
            </motion.div>
          )}
          {mutationSuccess && (
            <motion.div className="mb-4 p-3 text-sm text-green-300 bg-green-900/30 border border-green-800/50 rounded-lg">
              {mutationSuccess}
            </motion.div>
          )}

          {/* Table section */}
          <Card className="relative backdrop-blur-md overflow-hidden shadow-xl border-gray-800/50">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 -z-10"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 -z-10"></div>
            <CardContent className="p-0"> {/* Remove padding for full-width table */}
              {isLoading ? (
                <div className="flex justify-center items-center min-h-[200px]">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-400"/>
                </div>
              ) : queryError ? (
                <div className="flex flex-col items-center justify-center min-h-[200px] text-red-400">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>Error fetching requests: {queryError.message}</p>
                    <Button variant="link" onClick={() => refetch()} className="mt-2 text-blue-400">Try Again</Button>
                </div>
              ) : !pendingRequests || pendingRequests.length === 0 ? (
                <div className="flex justify-center items-center min-h-[200px]">
                  <p className="text-gray-400">No pending boost requests found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto"> {/* Added for responsive table */} 
                  <table className="w-full text-sm text-left"> {/* Use HTML table */} 
                    <thead className="text-xs text-gray-300 uppercase bg-gray-800/60">
                      <tr>
                        <th scope="col" className="px-6 py-3">Req ID</th>
                        <th scope="col" className="px-6 py-3">User</th>
                        <th scope="col" className="px-6 py-3">Amount (ckBTC)</th>
                        <th scope="col" className="px-6 py-3">Fee (%)</th>
                        <th scope="col" className="px-6 py-3">Confirmations</th>
                        <th scope="col" className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map((request) => (
                        <tr key={request.id.toString()} className="border-b border-gray-700/50 hover:bg-gray-800/40">
                          <td className="px-6 py-4 font-medium text-gray-200 whitespace-nowrap">{request.id.toString()}</td>
                          <td className="px-6 py-4 text-gray-300 truncate max-w-[150px]" title={request.owner.toText()}>
                             {request.owner.toText().slice(0, 5)}...{request.owner.toText().slice(-5)}
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                             {(Number(request.amount) / 10**8).toFixed(8)}
                          </td>
                          <td className="px-6 py-4 text-gray-300">{request.maxFeePercentage.toFixed(2)}%</td>
                          <td className="px-6 py-4">
                             <span className="bg-gray-700 text-gray-200 text-xs font-medium me-2 px-2.5 py-0.5 rounded">
                                {request.confirmationsRequired.toString()}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button 
                              size="sm" 
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleAcceptBoost(request.id)}
                              disabled={acceptBoostMutation.isPending && acceptBoostMutation.variables === request.id}
                            >
                              {acceptBoostMutation.isPending && acceptBoostMutation.variables === request.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                "Accept Boost"
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 