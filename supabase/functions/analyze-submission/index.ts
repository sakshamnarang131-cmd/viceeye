import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { submission_id } = await req.json();
    if (!submission_id) throw new Error("submission_id is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: submission, error: fetchErr } = await supabaseAdmin
      .from("dropbox_submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (fetchErr || !submission) throw new Error("Submission not found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a financial fraud analyst AI. Analyze the following corruption/fraud submission and score it.

The submission contains:
- Category: ${submission.subject}
- Description: ${submission.description}
- Evidence file URL: ${submission.evidence_url || "No file attached"}

Score each dimension from 0-100 based on indicators present in the description and evidence:

1. Transaction Score: laundering indicators (money forwarded quickly +25, returns to original entity +40, split into small transfers +20, unusually large amount +15, no clear purpose +10)
2. Company Score: shell company indicators (company <1yr old + high money +30, few employees + big transactions +25, shares address with >=2 firms +25, owner linked to multiple companies +20)
3. Network Score: graph anomalies (closed loop A→B→C→A +60, hub company >5 connections +25, chain depth >=4 +25, money circulates only inside group +30)
4. Confidence Score: evidence quality (multiple independent submissions +40, consistent relationship reports +30, supporting description provided +15, repeated over time +15)

Return scores using the provided function.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this submission and provide risk scores.\n\nCategory: ${submission.subject}\nDescription: ${submission.description}\nEvidence URL: ${submission.evidence_url || "None"}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_risk_scores",
              description: "Submit the calculated risk scores for the fraud submission",
              parameters: {
                type: "object",
                properties: {
                  transaction_score: { type: "number", description: "Score 0-100 for laundering indicators" },
                  company_score: { type: "number", description: "Score 0-100 for shell company indicators" },
                  network_score: { type: "number", description: "Score 0-100 for network/graph anomalies" },
                  confidence_score: { type: "number", description: "Score 0-100 for evidence quality/reliability" },
                  summary: { type: "string", description: "Brief analysis summary explaining the scores" },
                },
                required: ["transaction_score", "company_score", "network_score", "confidence_score", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_risk_scores" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured scores");

    const scores = JSON.parse(toolCall.function.arguments);
    const { transaction_score, company_score, network_score, confidence_score, summary } = scores;

    // Calculate final risk score
    const riskScore = Math.round(
      0.35 * transaction_score +
      0.25 * company_score +
      0.30 * network_score +
      0.10 * confidence_score
    );

    let classification = "Low";
    if (riskScore >= 75) classification = "Critical";
    else if (riskScore >= 50) classification = "High";
    else if (riskScore >= 25) classification = "Moderate";

    const analysis = JSON.stringify({
      transaction_score,
      company_score,
      network_score,
      confidence_score,
      risk_score: riskScore,
      classification,
      summary,
    });

    const { error: updateErr } = await supabaseAdmin
      .from("dropbox_submissions")
      .update({ ai_risk_score: riskScore, ai_analysis: analysis })
      .eq("id", submission_id);

    if (updateErr) {
      console.error("Failed to update submission:", updateErr);
      throw new Error("Failed to save analysis");
    }

    return new Response(JSON.stringify({ success: true, analysis: JSON.parse(analysis) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-submission error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
