import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, AlertCircle, Clock, Loader2, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

const getRiskColor = (risk: number) => {
  if (risk >= 80) return "text-crimson";
  if (risk >= 50) return "text-primary";
  return "text-safe";
};

const getRiskBg = (risk: number) => {
  if (risk >= 80) return "bg-crimson/10 border-crimson/30";
  if (risk >= 50) return "bg-primary/10 border-primary/30";
  return "bg-safe/10 border-safe/30";
};

type RiskFilter = "all" | "low" | "medium" | "high";

const TransactionFeed = () => {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("transactions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const filtered = transactions?.filter((tx) => {
    const q = search.toLowerCase();
    if (q && !tx.from_entity.toLowerCase().includes(q) && !tx.to_entity.toLowerCase().includes(q) && !tx.txn_id.toLowerCase().includes(q)) return false;
    if (riskFilter === "low" && tx.risk_score >= 50) return false;
    if (riskFilter === "medium" && (tx.risk_score < 50 || tx.risk_score >= 80)) return false;
    if (riskFilter === "high" && tx.risk_score < 80) return false;
    if (typeFilter !== "all" && tx.txn_type !== typeFilter) return false;
    return true;
  });

  const riskButtons: { label: string; value: RiskFilter }[] = [
    { label: "All", value: "all" },
    { label: "Low", value: "low" },
    { label: "Medium", value: "medium" },
    { label: "High", value: "high" },
  ];

  return (
    <section className="px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-text-bright">Vice City Transaction Feed</h2>
            <p className="text-sm text-muted-foreground mt-1">Real-time monitoring of flagged financial flows across Vice City</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-primary font-mono">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            LIVE
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search entity or transaction ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
            />
          </div>
          <div className="flex gap-1.5">
            {riskButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setRiskFilter(btn.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                  riskFilter === btn.value
                    ? "bg-primary/10 border-primary/50 text-primary"
                    : "bg-secondary border-border text-secondary-foreground hover:border-primary/30"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="all">All Types</option>
            <option value="wire">Wire</option>
            <option value="crypto">Crypto</option>
            <option value="cash">Cash</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered?.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">No transactions match your filters.</p>
            )}
            {filtered?.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group flex items-center gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg border ${getRiskBg(tx.risk_score)}`}>
                  {tx.risk_score >= 80 ? (
                    <AlertCircle className="w-5 h-5 text-crimson" />
                  ) : tx.risk_score >= 50 ? (
                    <ArrowUpRight className="w-5 h-5 text-primary" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-safe" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{tx.txn_id}</span>
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full bg-secondary text-secondary-foreground font-mono">
                      {tx.txn_type}
                    </span>
                  </div>
                  <div className="text-sm text-foreground mt-0.5 truncate">
                    <span className="text-text-bright">{tx.from_entity}</span>
                    <span className="text-muted-foreground mx-2">→</span>
                    <span className="text-text-bright">{tx.to_entity}</span>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <div className="font-mono text-sm font-semibold text-text-bright">{tx.amount_display}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                  </div>
                </div>

                <div className="text-right min-w-[60px]">
                  <div className={`font-mono text-lg font-bold ${getRiskColor(tx.risk_score)}`}>
                    {tx.risk_score}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">RISK</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default TransactionFeed;
