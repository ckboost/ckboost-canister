import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import {
  Clock,
  Shield,
  DollarSign,
  Star,
  Eye,
  ArrowRightLeft,
  Zap,
  Globe
} from "lucide-react";

const features = [
  {
    title: "Instant Conversion",
    description: "Convert BTC to ckBTC in minutes instead of waiting for 6 confirmations (1 hour).",
    icon: <Clock className="h-6 w-6" />,
  },
  {
    title: "Risk-Free Boosting",
    description: "Service providers (Boosters) absorb the risk of double spending, providing you with immediate ckBTC.",
    icon: <Shield className="h-6 w-6" />,
  },
  {
    title: "Competitive Fees",
    description: "Boosters compete to offer the best rates, ensuring you get the most value for your Bitcoin.",
    icon: <DollarSign className="h-6 w-6" />,
  },
  {
    title: "Ecosystem-Wide Solution",
    description: "A standardized approach for fast on-ramping into ckBTC across the entire Internet Computer ecosystem.",
    icon: <Globe className="h-6 w-6" />,
  },
  {
    title: "Transparent Process",
    description: "Monitor the status of your boost request in real-time with full transparency.",
    icon: <Eye className="h-6 w-6" />,
  },
  {
    title: "Extendable Framework",
    description: "Designed to incorporate other ckTokens in the future, providing a flexible solution for the ICP ecosystem.",
    icon: <ArrowRightLeft className="h-6 w-6" />,
  },
  {
    title: "Lightning Fast",
    description: "Experience the speed of ckBoost with our optimized infrastructure and efficient processing.",
    icon: <Zap className="h-6 w-6" />,
  },
  {
    title: "Premium Experience",
    description: "Enjoy a seamless, user-friendly interface designed for both beginners and experienced users.",
    icon: <Star className="h-6 w-6" />,
  },
];

export function Features() {
  return (
    <section id="features" className="bg-black py-20 md:py-28 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-dark-blue bg-gradient-animated opacity-10" />
      
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
            Key Features
          </motion.h2>
          <motion.p
            className="mb-12 text-lg text-gray-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            ckBoost provides a seamless experience for converting Bitcoin to ckBTC with these powerful features.
          </motion.p>
        </div>
        
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 max-w-7xl mx-auto bg-black/30 backdrop-blur-sm rounded-xl border border-white/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {features.map((feature, index) => (
            <Feature key={feature.title} {...feature} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature border-white/10",
        (index === 0 || index === 4) && "lg:border-l border-white/10",
        index < 4 && "lg:border-b border-white/10"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-blue-400">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-blue-500/30 group-hover/feature:bg-blue-500 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-white">
          {title}
        </span>
      </div>
      <p className="text-sm text-gray-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
}; 