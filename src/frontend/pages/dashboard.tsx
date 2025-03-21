import { motion } from "framer-motion";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { useAuth } from "../lib/auth-context";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { Wallet, Zap } from "lucide-react";

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-950 via-blue-950/20 to-gray-950">
      {/* Animated background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
      
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.h1
          className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Dashboard
        </motion.h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-sm border border-gray-800 rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-xl font-bold text-white mb-4">Your Profile</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Principal ID:</span>
                <span className="font-medium text-white truncate max-w-[200px]">
                  {user?.principal}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Status:</span>
                <span className="font-medium text-green-400">Active</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-sm border border-gray-800 rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link to="/wallet">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white">
                  <Wallet className="h-4 w-4 mr-2" />
                  View Wallet
                </Button>
              </Link>
              <Link to="/boost">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white">
                  <Zap className="h-4 w-4 mr-2" />
                  Boost BTC
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 