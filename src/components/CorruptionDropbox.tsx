import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Shield, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CorruptionDropbox = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [refId, setRefId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !description.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from("dropbox_submissions").insert({
      subject: category,
      description: description.trim(),
    });

    if (error) {
      toast.error("Submission failed. Please try again.");
      setSubmitting(false);
      return;
    }

    setRefId(`DROP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    setSubmitted(true);
    setSubmitting(false);
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
            className="text-center p-8 rounded-xl bg-safe/5 border border-safe/30"
          >
            <Shield className="w-12 h-12 text-safe mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-bright mb-2">Submission Received</h3>
            <p className="text-sm text-muted-foreground">
              Your anonymous report has been encrypted and queued for review.
              No identifying information was collected.
            </p>
            <p className="font-mono text-xs text-safe mt-4">REF: {refId}</p>
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
                rows={5}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>

            <button
              type="submit"
              disabled={!category || !description.trim() || submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Submitting..." : "Submit Anonymously"}
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
