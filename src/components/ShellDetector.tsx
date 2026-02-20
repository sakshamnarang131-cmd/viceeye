import { motion } from "framer-motion";
import { Building2, AlertTriangle, Calendar, MapPin, Link2, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ShellDetector = () => {
  const { data: shells, isLoading } = useQuery({
    queryKey: ["shell_companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shell_companies")
        .select("*")
        .order("risk_score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="px-6 py-12 bg-surface-glass">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-text-bright">Vice City Shell Detector</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pattern-based identification of Vice City front companies
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shells?.map((shell, i) => (
              <motion.div
                key={shell.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="p-5 rounded-xl bg-card border border-border hover:border-primary/40 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-crimson/10 border border-crimson/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-crimson" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-bright text-sm">{shell.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {shell.zone}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-2xl font-bold text-crimson">{shell.risk_score}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">RISK</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 py-3 border-y border-border">
                  <div className="text-center">
                    <div className="font-mono text-sm font-semibold text-text-bright">{shell.employees}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Staff</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-sm font-semibold text-text-bright">{shell.revenue}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-sm font-semibold text-primary">{shell.connections}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Links</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {shell.flags.map((flag) => (
                    <div key={flag} className="flex items-center gap-2 text-xs">
                      <AlertTriangle className="w-3 h-3 text-primary flex-shrink-0" />
                      <span className="text-foreground">{flag}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-4">
                  <Calendar className="w-3 h-3" />
                  Registered {shell.registered_date}
                  <span className="mx-1">·</span>
                  <Link2 className="w-3 h-3" />
                  {shell.connections} linked entities
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ShellDetector;
