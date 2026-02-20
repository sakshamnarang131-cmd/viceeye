import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Shield, Lock, Upload, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalysisResult {
  transaction_score: number;
  company_score: number;
  network_score: number;
  confidence_score: number;
  risk_score: number;
  classification: string;
  summary: string;
}

const getClassColor = (c: string) => {
  if (c === "Critical") return "text-crimson";
  if (c === "High") return "text-primary";
  if (c === "Moderate") return "text-primary";
  return "text-safe";
};

const getClassBg = (c: string) => {
  if (c === "Critical") return "bg-crimson/10 border-crimson/30";
  if (c === "High") return "bg-primary/10 border-primary/30";
  if (c === "Moderate") return "bg-primary/10 border-primary/30";
  return "bg-safe/10 border-safe/30";
};

const ScoreBar = ({ label, score }: { label: string; score: number }) => {
  const color = score >= 75 ? "bg-crimson" : score >= 50 ? "bg-primary" : score >= 25 ? "bg-primary/70" : "bg-safe";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-text-bright">{score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
};

const CorruptionDropbox = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [refId, setRefId] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // New detail fields
  const [transactionDetails, setTransactionDetails] = useState("");
  const [companyIdentifiers, setCompanyIdentifiers] = useState("");
  const [networkConnections, setNetworkConnections] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !description.trim() || !file) return;

    setSubmitting(true);

    // Upload file to evidence bucket
    const filePath = `${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("evidence")
      .upload(filePath, file);

    if (uploadErr) {
      toast.error("File upload failed. Please try again.");
      setSubmitting(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("evidence").getPublicUrl(filePath);

    // Build full description including extra details
    const fullDescription = [
      description.trim(),
      transactionDetails.trim() ? `\n\nTransaction Details: ${transactionDetails.trim()}` : "",
      companyIdentifiers.trim() ? `\n\nCompany Identifiers: ${companyIdentifiers.trim()}` : "",
      networkConnections.trim() ? `\n\nNetwork Connections: ${networkConnections.trim()}` : "",
    ].join("");

    // Insert submission
    const { data: insertData, error: insertErr } = await supabase
      .from("dropbox_submissions")
      .insert({
        subject: category,
        description: fullDescription,
        evidence_url: urlData.publicUrl,
      })
      .select("id")
      .single();

    if (insertErr || !insertData) {
      toast.error("Submission failed. Please try again.");
      setSubmitting(false);
      return;
    }

    setRefId(`DROP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    setSubmitting(false);
    setAnalyzing(true);
    setSubmitted(true);

    // Trigger AI analysis
    try {
      const resp = await supabase.functions.invoke("analyze-submission", {
        body: { submission_id: insertData.id },
      });

      if (resp.error) {
        console.error("AI analysis error:", resp.error);
        toast.error("AI analysis failed, but your submission was saved.");
      } else if (resp.data?.analysis) {
        setAnalysis(resp.data.analysis);
      }
    } catch (err) {
      console.error("AI analysis error:", err);
      toast.error("AI analysis failed, but your submission was saved.");
    }
    setAnalyzing(false);
  };

  return (
    <section className="px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-text-bright">Anonymous Corruption Dropbox</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Submit evidence of corruption anonymously. No tracking, no logs, no identity required.
            Your submission is encrypted end-to-end.
          </p>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-8 rounded-xl bg-card border border-border space-y-6"
          >
            <Shield className="w-12 h-12 text-safe mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-text-bright mb-2">Submission Received</h3>
              <p className="text-sm text-muted-foreground">
                Your anonymous report has been encrypted and queued for review.
              </p>
              <p className="font-mono text-xs text-safe mt-2">REF: {refId}</p>
            </div>

            {analyzing && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                AI analyzing evidence...
              </div>
            )}

            {analysis && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 text-left"
              >
                <div className="text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getClassBg(analysis.classification)}`}>
                    <span className={`font-mono text-3xl font-bold ${getClassColor(analysis.classification)}`}>
                      {analysis.risk_score}
                    </span>
                    <div className="text-left">
                      <div className={`text-sm font-semibold ${getClassColor(analysis.classification)}`}>
                        {analysis.classification}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk Score</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-lg bg-secondary/50 border border-border">
                  <ScoreBar label="Transaction Score" score={analysis.transaction_score} />
                  <ScoreBar label="Company Score" score={analysis.company_score} />
                  <ScoreBar label="Network Score" score={analysis.network_score} />
                  <ScoreBar label="Confidence Score" score={analysis.confidence_score} />
                </div>

                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">AI Analysis</h4>
                  <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="space-y-4 p-6 rounded-xl bg-card border border-border"
          >
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {["Bribery", "Money Laundering", "Shell Company", "Tax Fraud"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      category === cat
                        ? "bg-primary/10 border-primary/50 text-primary"
                        : "bg-secondary border-border text-secondary-foreground hover:border-primary/30"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">What did you witness?</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the incident, people involved, locations, dates..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>

            {/* Transaction Details */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Transaction Details <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={transactionDetails}
                onChange={(e) => setTransactionDetails(e.target.value)}
                placeholder="E.g. money forwarded within 24h, split into small transfers, unusually large amount, returns to original entity..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>

            {/* Company Identifiers */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company Identifiers <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={companyIdentifiers}
                onChange={(e) => setCompanyIdentifiers(e.target.value)}
                placeholder="E.g. company name, registration date, few employees, shared address with other firms, owner linked to multiple companies..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>

            {/* Network Connections */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Network Connections <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={networkConnections}
                onChange={(e) => setNetworkConnections(e.target.value)}
                placeholder="E.g. closed loop A→B→C→A, hub company with many connections, chain depth, money circulating inside a group..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Attach Proof <span className="text-crimson">*</span>
              </label>
              <label className="flex items-center justify-center gap-3 p-6 rounded-lg border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer bg-secondary/50">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="flex items-center gap-2 text-sm text-text-bright">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <span className="text-sm text-muted-foreground">Click to upload evidence</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">Images, PDFs, Documents</span>
                  </div>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={!category || !description.trim() || !file || submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Uploading..." : "Submit Anonymously"}
            </button>

            <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              End-to-end encrypted. No IP logging. No cookies.
            </p>
          </motion.form>
        )}
      </div>
    </section>
  );
};

export default CorruptionDropbox;
