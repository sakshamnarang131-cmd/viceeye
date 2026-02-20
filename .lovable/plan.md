

# ShadowEye Enhancement Plan

This is a large multi-part implementation covering 5 areas: font fix, sample data seeding, search/filters, enhanced dropbox with file upload, and AI-powered risk analysis.

---

## Part 1: Fix Site Font

The site currently imports Inter and JetBrains Mono via Google Fonts. The font is configured correctly in tailwind.config.ts and index.css, but the `body` styling in `App.css` has conflicting defaults (the `#root` styles from the Vite template). We will clean up `App.css` to remove stale Vite boilerplate and ensure fonts render cleanly across all sections.

---

## Part 2: Seed Sample Data

Insert realistic sample data into all 4 tables:
- **transactions**: ~10 records with varied risk scores, entity names, amounts, and types (wire, crypto, cash)
- **shell_companies**: ~6 records with flags, zones, employees, revenue
- **zones**: ~6 zones with threat levels and volumes

This will be done using the data insert tool (not migrations).

---

## Part 3: Search and Filters on Transaction Feed

Add a filter bar above the transaction list in `TransactionFeed.tsx`:
- **Text search**: Filter by entity name or transaction ID
- **Risk level filter**: Low (0-49), Medium (50-79), High (80-100) toggle buttons
- **Transaction type filter**: Dropdown for wire/crypto/cash/all
- All filtering done client-side on the fetched data

---

## Part 4: Enhanced Corruption Dropbox

Redesign `CorruptionDropbox.tsx` to include:

1. **Category selection** (keep existing: Bribery, Money Laundering, Shell Company, Tax Fraud)
2. **"What did you witness?" textarea** (keep existing)
3. **Attach Proof** (NEW, required):
   - File upload input accepting images, PDFs, documents
   - File is uploaded to a new Lovable Cloud storage bucket called `evidence`
   - The public URL of the uploaded file is stored in the `evidence_url` column of `dropbox_submissions`
   - Upload is mandatory -- form cannot submit without a file attached

### Database changes:
- Create a storage bucket `evidence` (public read for AI processing)
- Add an `ai_risk_score` column (integer, nullable) and `ai_analysis` column (text, nullable) to `dropbox_submissions` for storing AI results

### Storage RLS:
- Allow anonymous uploads to the `evidence` bucket
- Allow public reads for the AI edge function to access files

---

## Part 5: AI Risk Analysis Edge Function

Create an edge function `analyze-submission` that:

1. Is triggered after a dropbox submission is inserted (called from the frontend after successful insert)
2. Receives the submission ID
3. Fetches the submission record (category, description, evidence_url)
4. Sends the evidence URL and description to Lovable AI (google/gemini-3-flash-preview) with a structured prompt
5. The AI evaluates the evidence and returns scores using tool calling for structured output

### AI Prompt Logic

The AI will analyze the submission and return structured scores based on the formulas provided:

- **Transaction Score (0-100)**: Based on laundering indicators described in the submission
- **Company Score (0-100)**: Based on shell company indicators
- **Network Score (0-100)**: Based on network/graph anomalies described
- **Confidence Score (0-100)**: Based on evidence quality (file attached, description length, specificity)

### Final Risk Score Calculation (done in the edge function, not by AI):

```text
RISK_SCORE =
  (0.35 x Transaction_Score)
  + (0.25 x Company_Score)
  + (0.30 x Network_Score)
  + (0.10 x Confidence_Score)
```

### Classification:
```text
0-24   -> Low
25-49  -> Moderate
50-74  -> High
75-100 -> Critical
```

6. Updates `dropbox_submissions` with the computed `ai_risk_score` and `ai_analysis` (JSON string with breakdown)
7. The frontend shows the analysis result after submission -- displays the risk score, classification, and breakdown

### Edge Function Details:
- File: `supabase/functions/analyze-submission/index.ts`
- Uses `LOVABLE_API_KEY` (already configured) and `SUPABASE_SERVICE_ROLE_KEY` for admin DB access
- CORS headers included
- `verify_jwt = false` in config.toml
- Handles 429/402 rate limit errors gracefully

---

## Part 6: Updated UI for Post-Submission

After the dropbox submission + AI analysis completes, the success screen will show:
- The reference ID
- A risk score gauge with the classification (Low/Moderate/High/Critical)
- Breakdown of the 4 sub-scores (Transaction, Company, Network, Confidence)
- The AI's analysis summary text

---

## Technical Summary

### New files:
- `supabase/functions/analyze-submission/index.ts` -- AI risk analysis edge function

### Modified files:
- `src/App.css` -- Remove Vite boilerplate
- `src/components/TransactionFeed.tsx` -- Add search bar and filter controls
- `src/components/CorruptionDropbox.tsx` -- Add file upload (required), redesign form, show AI results post-submission
- `supabase/config.toml` -- Add analyze-submission function config

### Database changes (migrations):
- Create storage bucket `evidence` with appropriate RLS
- Add columns `ai_risk_score` (integer, nullable) and `ai_analysis` (text, nullable) to `dropbox_submissions`

### Data inserts:
- ~10 transactions, ~6 shell companies, ~6 zones seeded via insert tool

### Dependencies:
- No new npm packages needed (file upload uses native input + Supabase storage SDK)

