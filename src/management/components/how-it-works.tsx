import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import {
  Bitcoin,
  ClipboardCheck,
  Eye,
  CheckCircle,
  Clock,
  ArrowRight
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Deposit BTC",
    description: "Send Bitcoin to a designated address where ckBTC will be minted to your account.",
    icon: <Bitcoin className="h-6 w-6" />
  },
  {
    number: "02",
    title: "Register Boost",
    description: "Create a boost request with the ckBoost service to accelerate your conversion.",
    icon: <ClipboardCheck className="h-6 w-6" />
  },
  {
    number: "03",
    title: "Boosters Monitor",
    description: "Service providers watch for new requests and monitor Bitcoin transaction status.",
    icon: <Eye className="h-6 w-6" />
  },
  {
    number: "04",
    title: "Receive ckBTC",
    description: "Once a Booster accepts your request, you receive ckBTC immediately, minus a small fee.",
    icon: <CheckCircle className="h-6 w-6" />
  },
  {
    number: "05",
    title: "Finish",
    description: "When the original BTC to ckBTC conversion completes, the Booster receives the ckBTC.",
    icon: <Clock className="h-6 w-6" />
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-black py-20 md:py-28 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-dark bg-gradient-animated opacity-20" />
      
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
        <div className="mx-auto max-w-3xl text-center mb-16">
          <motion.h2
            className="mb-4 text-3xl font-bold tracking-tight text-gradient md:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            How It Works
          </motion.h2>
          <motion.p
            className="text-lg text-gray-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            ckBoost provides a seamless process for fast Bitcoin to ckBTC conversion.
          </motion.p>
        </div>
        
        {/* Desktop Timeline (Modern) */}
        <div className="hidden md:block relative">
          <motion.div
            className="max-w-5xl mx-auto bg-black/30 backdrop-blur-sm rounded-xl border border-white/5 p-8 relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Horizontal connecting line */}
            <div className="absolute top-[88px] left-0 w-full h-0.5 bg-gradient-to-r from-blue-500/50 via-indigo-500/50 to-blue-500/50" />
            
            <div className="grid grid-cols-5 gap-6">
              {steps.map((step, index) => (
                <StepItem 
                  key={index} 
                  step={step} 
                  index={index} 
                  isLast={index === steps.length - 1} 
                />
              ))}
            </div>
          </motion.div>
        </div>
        
        {/* Mobile Timeline (Modern Vertical) */}
        <div className="md:hidden relative">
          <motion.div
            className="bg-black/30 backdrop-blur-sm rounded-xl border border-white/5 p-6 relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Vertical connecting line */}
            <div className="absolute left-[32px] top-[88px] bottom-[32px] w-0.5 bg-gradient-to-b from-blue-500/50 via-indigo-500/50 to-blue-500/50" />
            
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={cn(
                  "relative pl-16 pb-12",
                  index === steps.length - 1 && "pb-0"
                )}
              >
                {/* Step number and icon */}
                <div className="absolute left-0 top-0 z-10">
                  <div className="flex flex-col items-center">
                    <div className="text-xs font-semibold text-blue-400 mb-2">{step.number}</div>
                    <div className="w-12 h-12 rounded-full bg-black border border-white/10 flex items-center justify-center text-blue-400 shadow-lg">
                      {step.icon}
                    </div>
                  </div>
                </div>
                
                {/* Step content */}
                <div className="group">
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors duration-200">{step.title}</h3>
                  <p className="text-sm text-gray-300">{step.description}</p>
                </div>
                
                {/* Arrow for all but the last step */}
                {index < steps.length - 1 && (
                  <div className="absolute left-[32px] bottom-6 transform -translate-x-1/2 text-blue-400">
                    <ArrowRight className="h-4 w-4 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Step item component for desktop view
function StepItem({ step, index, isLast }: { step: typeof steps[0], index: number, isLast: boolean }) {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true, margin: "-100px" }}
    >
      {/* Step number */}
      <div className="text-xs font-semibold text-blue-400 mb-2 text-center">{step.number}</div>
      
      {/* Step circle with icon */}
      <div className="flex justify-center mb-6 relative">
        <div className="w-14 h-14 rounded-full bg-black border border-white/10 flex items-center justify-center text-blue-400 shadow-lg z-10">
          {step.icon}
        </div>
        
        {/* Arrow for all but the last step */}
        {!isLast && (
          <motion.div 
            className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 text-blue-400"
            animate={{ 
              x: [0, 5, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <ArrowRight className="h-4 w-4" />
          </motion.div>
        )}
      </div>
      
      {/* Step content */}
      <div className="group text-center">
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors duration-200">{step.title}</h3>
        <p className="text-sm text-gray-300">{step.description}</p>
      </div>
    </motion.div>
  );
} 