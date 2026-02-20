import { motion } from "framer-motion";
import { MapPin, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ZoneHeatmap = () => {
  const { data: zones, isLoading } = useQuery({
    queryKey: ["zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zones")
        .select("*")
        .order("threat_level", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getBarColor = (threat: number) => {
    if (threat >= 80) return "bg-crimson";
    if (threat >= 50) return "bg-primary";
    return "bg-accent";
  };

  return (
    <section className="px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-text-bright">Zone Threat Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Threat levels across Vice City's monitored districts
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {zones?.map((zone, i) => (
              <motion.div
                key={zone.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-2 w-48 flex-shrink-0">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium text-text-bright">{zone.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{zone.zone_id}</div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="h-3 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${zone.threat_level}%` }}
                      transition={{ delay: i * 0.08 + 0.3, duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${getBarColor(zone.threat_level)}`}
                    />
                  </div>
                </div>

                <div className="flex gap-6 text-right flex-shrink-0">
                  <div>
                    <div className="font-mono text-sm font-semibold text-text-bright">{zone.entities}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Entities</div>
                  </div>
                  <div>
                    <div className="font-mono text-sm font-semibold text-text-bright">{zone.volume}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Volume</div>
                  </div>
                  <div className="min-w-[40px]">
                    <div className={`font-mono text-sm font-bold ${zone.threat_level >= 80 ? "text-crimson" : zone.threat_level >= 50 ? "text-primary" : "text-accent"}`}>
                      {zone.threat_level}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase">Threat</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ZoneHeatmap;
