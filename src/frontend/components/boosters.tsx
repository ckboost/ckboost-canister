import { motion } from "framer-motion";
import { Users, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

// Calculate global statistics from the data
const boosterStats = {
  totalBoosters: 24,
  totalBoosts: 19903,
  totalVolume: 859.19,
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
          className="grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-4xl mx-auto mb-16"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          <StatCard 
            title="Active Boosters" 
            value={boosterStats.totalBoosters.toString()} 
            icon={<Users className="h-8 w-8 text-blue-400" />}
            description="Service providers in our network"
          />
          <StatCard 
            title="Total Boosts" 
            value={boosterStats.totalBoosts.toLocaleString()} 
            icon={<Zap className="h-8 w-8 text-purple-400" />}
            description="Successful conversions completed"
          />
          <StatCard 
            title="Volume Boosted" 
            value={`₿ ${boosterStats.totalVolume.toFixed(2)}`} 
            icon={<Bitcoin className="h-8 w-8 text-orange-400" />}
            description="Total Bitcoin processed"
          />
        </motion.div>
        
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Link to="/boost-lp">
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
  description
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode;
  description: string;
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
        <div className="text-3xl font-bold text-white mb-2">{value}</div>
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