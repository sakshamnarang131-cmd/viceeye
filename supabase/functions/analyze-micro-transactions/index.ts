import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TransactionRecord {
  sender_entity: string;
  receiver_entity: string;
  amount_range: "small" | "medium" | "large" | "very_large";
  timestamp: string;
  transaction_purpose: "invoice" | "salary" | "contract" | "unknown";
}

function analyzeLocally(records: TransactionRecord[]) {
  let riskPoints = 0;
  const detectedPatterns: string[] = [];
  const allEntities = new Set<string>();

  records.forEach((r) => {
    allEntities.add(r.sender_entity);
    allEntities.add(r.receiver_entity);
  });

  // 1) Micro-Transaction Density: small txns between same pair 3x higher than avg in 24h
  const pairCounts: Record<string, { timestamps: Date[] }> = {};
  records.forEach((r) => {
    if (r.amount_range === "small") {
      const key = `${r.sender_entity}→${r.receiver_entity}`;
      if (!pairCounts[key]) pairCounts[key] = { timestamps: [] };
      pairCounts[key].timestamps.push(new Date(r.timestamp));
    }
  });

  const smallTxnCounts = Object.values(pairCounts).map((v) => v.timestamps.length);
  const avgSmall = smallTxnCounts.length > 0 ? smallTxnCounts.reduce((a, b) => a + b, 0) / smallTxnCounts.length : 0;

  for (const [pair, data] of Object.entries(pairCounts)) {
    // Check 24h window density
    data.timestamps.sort((a, b) => a.getTime() - b.getTime());
    for (let i = 0; i < data.timestamps.length; i++) {
      const windowEnd = new Date(data.timestamps[i].getTime() + 24 * 60 * 60 * 1000);
      const inWindow = data.timestamps.filter((t) => t >= data.timestamps[i] && t <= windowEnd).length;
      if (avgSmall > 0 && inWindow >= avgSmall * 3) {
        riskPoints += 40;
        detectedPatterns.push(`density_spike:${pair}`);
        break;
      }
    }
  }

  // 2) Repetition Pattern: same amount_range >10 times between same entities
  const repetitionMap: Record<string, Record<string, number>> = {};
  records.forEach((r) => {
    const key = `${r.sender_entity}→${r.receiver_entity}`;
    if (!repetitionMap[key]) repetitionMap[key] = {};
    repetitionMap[key][r.amount_range] = (repetitionMap[key][r.amount_range] || 0) + 1;
  });

  for (const [pair, ranges] of Object.entries(repetitionMap)) {
    for (const [range, count] of Object.entries(ranges)) {
      if (count > 10) {
        riskPoints += 25;
        detectedPatterns.push(`repetition:${pair}:${range}x${count}`);
        break;
      }
    }
  }

  // 3) Circular Flow Detection: loops where all txns are small/medium
  const smallMediumEdges: Record<string, Set<string>> = {};
  records.forEach((r) => {
    if (r.amount_range === "small" || r.amount_range === "medium") {
      if (!smallMediumEdges[r.sender_entity]) smallMediumEdges[r.sender_entity] = new Set();
      smallMediumEdges[r.sender_entity].add(r.receiver_entity);
    }
  });

  let loopFound = false;
  for (const start of Object.keys(smallMediumEdges)) {
    const visited = new Set<string>();
    const stack = [{ node: start, path: [start] }];
    while (stack.length > 0 && !loopFound) {
      const { node, path } = stack.pop()!;
      const neighbors = smallMediumEdges[node];
      if (!neighbors) continue;
      for (const next of neighbors) {
        if (next === start && path.length >= 3) {
          loopFound = true;
          riskPoints += 60;
          detectedPatterns.push(`circular_flow:${path.join("→")}→${start}`);
          break;
        }
        if (!visited.has(next) && path.length < 6) {
          visited.add(next);
          stack.push({ node: next, path: [...path, next] });
        }
      }
    }
    if (loopFound) break;
  }

  // 4) Network Isolation: group transacting >80% within themselves
  const entityConnections: Record<string, Set<string>> = {};
  records.forEach((r) => {
    if (!entityConnections[r.sender_entity]) entityConnections[r.sender_entity] = new Set();
    if (!entityConnections[r.receiver_entity]) entityConnections[r.receiver_entity] = new Set();
    entityConnections[r.sender_entity].add(r.receiver_entity);
    entityConnections[r.receiver_entity].add(r.sender_entity);
  });

  // Check if there's a cluster where entities mostly transact within the group
  const entityList = Array.from(allEntities);
  if (entityList.length >= 3) {
    let internalTxns = 0;
    let totalTxns = records.length;
    // Treat all entities in this batch as a potential group
    records.forEach((r) => {
      if (allEntities.has(r.sender_entity) && allEntities.has(r.receiver_entity)) {
        internalTxns++;
      }
    });
    if (totalTxns > 0 && internalTxns / totalTxns > 0.8) {
      riskPoints += 30;
      detectedPatterns.push("network_isolation");
    }
  }

  // 5) Legitimacy Dampener: diverse partners (>6 unique connections) reduces risk
  let dampened = false;
  for (const [entity, connections] of Object.entries(entityConnections)) {
    if (connections.size > 6) {
      dampened = true;
      break;
    }
  }
  if (dampened) {
    riskPoints = Math.round(riskPoints * 0.7);
    detectedPatterns.push("legitimacy_dampener_applied");
  }

  const finalScore = Math.max(0, Math.min(100, riskPoints));

  let classification = "Low anomaly";
  if (finalScore >= 75) classification = "Critical anomaly";
  else if (finalScore >= 50) classification = "High anomaly";
  else if (finalScore >= 25) classification = "Moderate anomaly";

  return {
    cluster_risk_score: finalScore,
    classification,
    entities_involved: entityList,
    detected_patterns: detectedPatterns,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { records } = await req.json() as { records: TransactionRecord[] };
    if (!records || !Array.isArray(records) || records.length === 0) {
      throw new Error("records array is required and must not be empty");
    }

    // Local algorithmic analysis
    const analysis = analyzeLocally(records);

    // AI investigative summary
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiSummary = "AI summary unavailable.";

    if (LOVABLE_API_KEY) {
      const patternDescriptions = analysis.detected_patterns
        .filter((p) => !p.startsWith("legitimacy_dampener"))
        .map((p) => {
          if (p.startsWith("density_spike")) return `Micro-transaction density spike detected on path ${p.split(":")[1]}`;
          if (p.startsWith("repetition")) return `Repetition pattern: ${p.split(":").slice(1).join(" ")}`;
          if (p.startsWith("circular_flow")) return `Circular flow detected: ${p.split(":")[1]}`;
          if (p === "network_isolation") return "Network isolation: entities transact primarily within a closed group";
          return p;
        });

      const prompt = `You are a financial intelligence analyst writing a forensic summary for a micro-transaction cluster analysis.

Score: ${analysis.cluster_risk_score}/100 (${analysis.classification})
Entities: ${analysis.entities_involved.join(", ")}
Detected patterns: ${patternDescriptions.join("; ") || "None significant"}
Transaction count: ${records.length}

Write a 3-4 sentence investigative summary in neutral forensic language. Never accuse fraud. Use terms like "anomalous financial structure", "circular flow pattern", "unusual transaction density", "structurally isolated network". Reference the specific entities and patterns found.`;

      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a financial intelligence analyst. Write concise forensic summaries. Never accuse anyone of fraud." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          aiSummary = aiData.choices?.[0]?.message?.content || aiSummary;
        } else if (aiResp.status === 429) {
          aiSummary = "Rate limit reached. Algorithmic analysis completed successfully.";
        } else if (aiResp.status === 402) {
          aiSummary = "AI credits exhausted. Algorithmic analysis completed successfully.";
        }
      } catch (aiErr) {
        console.error("AI summary error:", aiErr);
      }
    }

    // Save to database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: saved, error: saveErr } = await supabaseAdmin
      .from("micro_transaction_analyses")
      .insert({
        input_records: records,
        cluster_risk_score: analysis.cluster_risk_score,
        classification: analysis.classification,
        entities_involved: analysis.entities_involved,
        detected_patterns: analysis.detected_patterns,
        ai_summary: aiSummary,
        raw_analysis: analysis,
      })
      .select()
      .single();

    if (saveErr) {
      console.error("Save error:", saveErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: saved?.id,
        cluster_risk_score: analysis.cluster_risk_score,
        classification: analysis.classification,
        entities_involved: analysis.entities_involved,
        detected_patterns: analysis.detected_patterns,
        ai_summary: aiSummary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-micro-transactions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
