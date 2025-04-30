import { motion } from "framer-motion";
import { Users, Zap, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory, _SERVICE } from "../../backend/declarations/backend.did.js";

const BACKEND_CANISTER_ID = "75egi-7qaaa-aaaao-qj6ma-cai";

// Create actor with anonymous identity
const createActor = () => {
  const agent = new HttpAgent({ host: "https://icp0.io" });
  return Actor.createActor<_SERVICE>(idlFactory, { 
    agent, 
    canisterId: Principal.fromText(BACKEND_CANISTER_ID) 
  });
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function BoosterStats() {
  const { data: boostRequests, isLoading: isLoadingBoosts } = useQuery({
    queryKey: ['allBoostRequests'],
    queryFn: async () => {
      const actor = createActor();
      return await actor.getAllBoostRequests();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: boosterAccounts, isLoading: isLoadingBoosters } = useQuery({
    queryKey: ['allBoosterAccounts'],
    queryFn: async () => {
      const actor = createActor();
      return await actor.getAllBoosterAccounts();
    },
    refetchInterval: 30000,
  });

  // Calculate statistics
  const stats = {
    totalBoosters: boosterAccounts ? boosterAccounts.length : 0,
    totalBoosts: boostRequests ? boostRequests.length : 0,
    totalVolume: boostRequests ? 
      boostRequests.reduce((sum: number, req: { amount: bigint }) => 
        sum + Number(req.amount), 0) / 1e8 : 0,
    averageBoostTime: "3 min", // Hardcoded as requested
  };

  return (
    <section id="booster-network" className="bg-black py-20 md:py-28 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-blue-purple bg-gradient-animated opacity-10" />
      
      {/* Animated dots */}
      <div className="animated-dots">
        {[...Array(8)].map((_, i) => (
          <div 
            key={i}
            className="dot"
            style={{
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${Math.random() * 10 + 15}s`,
            }}
          />
        ))}
      </div>
      
      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <motion.h2
            className="mb-4 text-3xl font-bold tracking-tight text-gradient md:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Booster Network
          </motion.h2>
          <motion.p
            className="mb-12 text-lg text-gray-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Our global network of boosters is ready to accelerate your BTC to ckBTC conversion.
          </motion.p>
        </div>
        
        {/* Statistics Grid */}
        <motion.div
          className="grid grid-cols-1 gap-8 sm:grid-cols-4 max-w-5xl mx-auto mb-16"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          <StatCard 
            title="Active Boosters" 
            value={stats.totalBoosters.toString()} 
            icon={<Users className="h-8 w-8 text-blue-400" />}
            description="Service providers in our network"
            isLoading={isLoadingBoosters}
          />
          <StatCard 
            title="Total Boosts" 
            value={stats.totalBoosts.toLocaleString()} 
            icon={<Zap className="h-8 w-8 text-purple-400" />}
            description="Successful conversions completed"
            isLoading={isLoadingBoosts}
          />
          <StatCard 
            title="Volume Boosted" 
            value={`₿ ${stats.totalVolume.toFixed(2)}`} 
            icon={<Bitcoin className="h-8 w-8 text-orange-400" />}
            description="Total Bitcoin processed"
            isLoading={isLoadingBoosts}
          />
          <StatCard 
            title="Average Boost Time" 
            value={stats.averageBoostTime} 
            icon={<Clock className="h-8 w-8 text-green-400" />}
            description="Time to complete a boost"
            isLoading={false}
          />
        </motion.div>
        
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Link to="https://btvft-laaaa-aaaao-qkagq-cai.icp0.io/" target="_blank">
              <Button 
                variant="outline" 
                size="lg" 
                className="border-gray-800 text-gray-300 hover:bg-gray-900 hover-lift glow-border"
              >
                Become a Booster
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Stat card component
function StatCard({ 
  title, 
  value, 
  icon,
  description,
  isLoading
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode;
  description: string;
  isLoading?: boolean;
}) {
  return (
    <motion.div variants={item} className="relative">
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 h-full hover:border-blue-900/50 transition-all duration-300 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-gray-800/80 border border-gray-700">
            {icon}
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-300 mb-1">{title}</h3>
        <div className="text-3xl font-bold text-white mb-2">
          {isLoading ? (
            <div className="h-8 w-24 bg-gray-800 rounded animate-pulse mx-auto" />
          ) : (
            value
          )}
        </div>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </motion.div>
  );
}

// Bitcoin icon component
function Bitcoin({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m3.94.694-.347 1.969M7.116 5.251l-1.256-.221m6.489 2.145 2.696-3.32" />
    </svg>
  );
} 