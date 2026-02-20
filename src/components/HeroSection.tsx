import { motion } from "framer-motion";
import { Eye, Shield, AlertTriangle } from "lucide-react";
import NetworkCanvas from "./NetworkCanvas";

const HeroSection = () => {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-grid bg-vice-gradient">
      <NetworkCanvas />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-primary">VICE CITY INTELLIGENCE</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight text-text-bright mb-6 leading-[0.95]">
            Welcome to{" "}
            <span className="text-primary glow-text-pink">Vice City</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Real-time detection and visualization of underground financial flows
            across Vice City. Shell companies, phantom transactions, hidden
            networks — all exposed under the neon lights.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-8 mt-12"
        >
          {[
            { icon: Shield, label: "Active Zones", value: "12" },
            { icon: AlertTriangle, label: "Flagged Entities", value: "847" },
            { icon: Eye, label: "Live Streams", value: "2.4K" },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-3">
              <stat.icon className="w-5 h-5 text-accent" />
              <div className="text-left">
                <div className="text-2xl font-bold font-mono text-text-bright">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
