import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Plus,
  Trash2,
  Zap,
  Loader2,
  Network,
  TrendingUp,
  ShieldAlert,
  Activity,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AmountRange = "small" | "medium" | "large" | "very_large";
type TxnPurpose = "invoice" | "salary" | "contract" | "unknown";

interface TransactionRecord {
  sender_entity: string;
  receiver_entity: string;
  amount_range: AmountRange;
  timestamp: string;
  transaction_purpose: TxnPurpose;
}

interface AnalysisResult {
  cluster_risk_score: number;
  classification: string;
  entities_involved: string[];
  detected_patterns: string[];
  ai_summary: string;
}

const SAMPLE_RECORDS: TransactionRecord[] = [
  { sender_entity: "Vercetti Estate Holdings", receiver_entity: "Cherry Poppers Inc", amount_range: "small", timestamp: "2024-03-15T08:30:00Z", transaction_purpose: "invoice" },
  { sender_entity: "Cherry Poppers Inc", receiver_entity: "Kaufman Cabs LLC", amount_range: "small", timestamp: "2024-03-15T09:15:00Z", transaction_purpose: "contract" },
  { sender_entity: "Kaufman Cabs LLC", receiver_entity: "Vercetti Estate Holdings", amount_range: "small", timestamp: "2024-03-15T10:00:00Z", transaction_purpose: "unknown" },
  { sender_entity: "Vercetti Estate Holdings", receiver_entity: "Cherry Poppers Inc", amount_range: "small", timestamp: "2024-03-15T11:30:00Z", transaction_purpose: "invoice" },
  { sender_entity: "Cherry Poppers Inc", receiver_entity: "Kaufman Cabs LLC", amount_range: "small", timestamp: "2024-03-15T12:45:00Z", transaction_purpose: "invoice" },
  { sender_entity: "Kaufman Cabs LLC", receiver_entity: "Vercetti Estate Holdings", amount_range: "medium", timestamp: "2024-03-15T14:00:00Z", transaction_purpose: "contract" },
  { sender_entity: "InterGlobal Films", receiver_entity: "Print Works Co", amount_range: "small", timestamp: "2024-03-15T15:30:00Z", transaction_purpose: "salary" },
  { sender_entity: "Print Works Co", receiver_entity: "Sunshine Autos", amount_range: "small", timestamp: "2024-03-15T16:15:00Z", transaction_purpose: "unknown" },
  { sender_entity: "Sunshine Autos", receiver_entity: "InterGlobal Films", amount_range: "small", timestamp: "2024-03-15T17:00:00Z", transaction_purpose: "contract" },
  { sender_entity: "Malibu Club Enterprises", receiver_entity: "Pole Position Mgmt", amount_range: "small", timestamp: "2024-03-15T09:00:00Z", transaction_purpose: "unknown" },
  { sender_entity: "Pole Position Mgmt", receiver_entity: "Malibu Club Enterprises", amount_range: "small", timestamp: "2024-03-15T10:30:00Z", transaction_purpose: "invoice" },
  { sender_entity: "Malibu Club Enterprises", receiver_entity: "Pole Position Mgmt", amount_range: "small", timestamp: "2024-03-15T12:00:00Z", transaction_purpose: "unknown" },
];

const emptyRecord = (): TransactionRecord => ({
  sender_entity: "",
  receiver_entity: "",
  amount_range: "small",
  timestamp: new Date().toISOString().slice(0, 16),
  transaction_purpose: "unknown",
});

const patternIcon = (pattern: string) => {
  if (pattern.startsWith("density")) return <Activity className="w-4 h-4 text-sunset-orange" />;
  if (pattern.startsWith("circular")) return <RotateCcw className="w-4 h-4 text-crimson" />;
  if (pattern.startsWith("repetition")) return <TrendingUp className="w-4 h-4 text-primary" />;
  if (pattern === "network_isolation") return <Network className="w-4 h-4 text-accent" />;
  if (pattern.startsWith("legitimacy")) return <ShieldAlert className="w-4 h-4 text-safe" />;
  return <Zap className="w-4 h-4 text-muted-foreground" />;
};

const patternLabel = (pattern: string) => {
  if (pattern.startsWith("density_spike")) return `Density Spike — ${pattern.split(":")[1]}`;
  if (pattern.startsWith("circular_flow")) return `Circular Flow — ${pattern.split(":")[1]}`;
  if (pattern.startsWith("repetition")) {
    const parts = pattern.split(":");
    return `Repetition — ${parts[1]} (${parts[2]})`;
  }
  if (pattern === "network_isolation") return "Network Isolation — Closed group detected";
  if (pattern === "legitimacy_dampener_applied") return "Legitimacy Dampener — Risk reduced 30%";
  return pattern;
};

const riskColor = (score: number) => {
  if (score >= 75) return "text-crimson";
  if (score >= 50) return "text-sunset-orange";
  if (score >= 25) return "text-primary";
  return "text-safe";
};

const riskBgClass = (score: number) => {
  if (score >= 75) return "border-crimson/40 bg-crimson/5";
  if (score >= 50) return "border-sunset-orange/40 bg-sunset-orange/5";
  if (score >= 25) return "border-primary/40 bg-primary/5";
  return "border-safe/40 bg-safe/5";
};

const MicroTransactionAnalyzer = () => {
  const [records, setRecords] = useState<TransactionRecord[]>([emptyRecord()]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const updateRecord = (index: number, field: keyof TransactionRecord, value: string) => {
    setRecords((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRecord = () => setRecords((prev) => [...prev, emptyRecord()]);

  const removeRecord = (index: number) => {
    if (records.length > 1) setRecords((prev) => prev.filter((_, i) => i !== index));
  };

  const loadSample = () => {
    setRecords(SAMPLE_RECORDS);
    setResult(null);
    toast.success("Sample Vice City data loaded");
  };

  const analyze = async () => {
    const valid = records.filter((r) => r.sender_entity.trim() && r.receiver_entity.trim());
    if (valid.length < 2) {
      toast.error("Add at least 2 valid transaction records");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-micro-transactions", {
        body: { records: valid },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data as AnalysisResult);
      toast.success("Analysis complete");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const inputClasses =
    "w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50";
  const selectClasses =
    "px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <section className="px-6 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-crimson/10 border border-crimson/30">
            <Zap className="w-5 h-5 text-crimson" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-bright font-display tracking-wide">
              MICRO-TRANSACTION CRISIS ANALYZER
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Detect hidden laundering networks through structural pattern analysis
            </p>
          </div>
        </div>

        <div className="mt-1 mb-8 flex items-center gap-2 text-xs font-mono text-crimson">
          <AlertTriangle className="w-3 h-3" />
          EMERGENCY ANTI-LAUNDERING CRACKDOWN MODE
        </div>

        {/* Transaction Input Grid */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-bright font-mono uppercase tracking-wider">
              Transaction Records ({records.length})
            </h3>
            <div className="flex gap-2">
              <button onClick={loadSample} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-colors">
                Load Vice City Sample
              </button>
              <button onClick={addRecord} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors">
                <Plus className="w-3 h-3" /> Add Record
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {records.map((record, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end p-3 rounded-lg bg-secondary/50 border border-border/50"
              >
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sender</label>
                  <input
                    className={inputClasses}
                    placeholder="Entity A"
                    value={record.sender_entity}
                    onChange={(e) => updateRecord(i, "sender_entity", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Receiver</label>
                  <input
                    className={inputClasses}
                    placeholder="Entity B"
                    value={record.receiver_entity}
                    onChange={(e) => updateRecord(i, "receiver_entity", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Amount</label>
                  <select className={selectClasses + " w-full"} value={record.amount_range} onChange={(e) => updateRecord(i, "amount_range", e.target.value)}>
                    <option value="small">&lt;$5K</option>
                    <option value="medium">$5K–$50K</option>
                    <option value="large">$50K–$500K</option>
                    <option value="very_large">&gt;$500K</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Timestamp</label>
                  <input
                    type="datetime-local"
                    className={inputClasses}
                    value={record.timestamp.slice(0, 16)}
                    onChange={(e) => updateRecord(i, "timestamp", e.target.value + ":00Z")}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Purpose</label>
                  <select className={selectClasses + " w-full"} value={record.transaction_purpose} onChange={(e) => updateRecord(i, "transaction_purpose", e.target.value)}>
                    <option value="invoice">Invoice</option>
                    <option value="salary">Salary</option>
                    <option value="contract">Contract</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => removeRecord(i)}
                    disabled={records.length <= 1}
                    className="p-2 rounded-lg text-muted-foreground hover:text-crimson hover:bg-crimson/10 transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Analyze Button */}
        <button
          onClick={analyze}
          disabled={isAnalyzing}
          className="w-full py-3.5 rounded-xl font-display font-bold text-sm uppercase tracking-widest bg-crimson/10 border border-crimson/40 text-crimson hover:bg-crimson/20 hover:glow-crimson transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              ANALYZING TRANSACTION CLUSTER...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              INITIATE CRISIS ANALYSIS
            </>
          )}
        </button>

        {/* Result Card */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className={`mt-8 rounded-xl border-2 ${riskBgClass(result.cluster_risk_score)} p-6`}
            >
              {/* Score Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Cluster Risk Assessment</p>
                  <div className="flex items-baseline gap-3">
                    <span className={`font-display text-5xl font-black ${riskColor(result.cluster_risk_score)}`}>
                      {result.cluster_risk_score}
                    </span>
                    <span className="text-sm font-mono text-muted-foreground">/100</span>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg border font-mono text-sm font-bold uppercase tracking-wider ${riskBgClass(result.cluster_risk_score)} ${riskColor(result.cluster_risk_score)}`}>
                  {result.classification}
                </div>
              </div>

              {/* Entities */}
              <div className="mb-5">
                <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Entities Involved ({result.entities_involved.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {result.entities_involved.map((entity) => (
                    <span key={entity} className="px-2.5 py-1 rounded-md bg-secondary border border-border text-xs font-mono text-text-bright">
                      {entity}
                    </span>
                  ))}
                </div>
              </div>

              {/* Detected Patterns */}
              <div className="mb-5">
                <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Detected Patterns</h4>
                <div className="space-y-2">
                  {result.detected_patterns.map((pattern, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/60 border border-border/50">
                      {patternIcon(pattern)}
                      <span className="text-sm text-foreground font-mono">{patternLabel(pattern)}</span>
                    </div>
                  ))}
                  {result.detected_patterns.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No significant structural anomalies detected.</p>
                  )}
                </div>
              </div>

              {/* AI Summary */}
              <div className="rounded-lg border border-border bg-surface-glass p-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-accent mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  AI Investigative Summary
                </h4>
                <p className="text-sm text-foreground leading-relaxed">{result.ai_summary}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default MicroTransactionAnalyzer;
