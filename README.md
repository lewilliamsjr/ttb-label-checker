# TTB Label Compliance Checker

AI-powered label verification tool for TTB compliance review. Upload an alcohol beverage label image, and it'll extract all the required fields and flag anything that looks off — brand name, ABV, government warning, the works.

Built as a take-home prototype in response to the compliance division discovery sessions.

---

## What It Does

- **Single label mode**: Drop in one label image, optionally paste in the application data fields to cross-check against, hit the button, and get results in a few seconds
- **Batch mode**: Drop in up to 50 labels at once — get a summary dashboard (approved / needs review / rejected counts) plus expandable detail rows for each one
- **Government warning check**: Specifically validates the warning is present, word-for-word, with "GOVERNMENT WARNING:" in all caps — the thing people sneak around most often
- **Handles the fuzzy stuff**: "STONE'S THROW" vs "Stone's Throw" gets flagged as a warning, not a hard rejection. The AI distinguishes between actual violations and obvious formatting differences

## Stack

- **Frontend**: React (Create React App), react-dropzone for the file UI, Axios
- **Backend**: Node.js / Express, Multer for file handling
- **AI**: Anthropic Claude (claude-opus-4-5) with vision — it reads the label image and returns structured JSON
- **No database**: Stateless, nothing persisted — clean for prototype purposes, and Marcus said not to do anything crazy with storage

---

## Setup

You'll need Node.js (v18+) and an Anthropic API key.

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/ttb-label-checker.git
cd ttb-label-checker
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file in the `/backend` directory:

```
ANTHROPIC_API_KEY=your_api_key_here
PORT=3001
```

Start the backend:

```bash
npm start
# or for dev with auto-restart:
npm run dev
```

### 3. Set up the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm start
```

That's it. The frontend proxies API calls to `localhost:3001` so you don't have to worry about CORS in dev.

Open `http://localhost:3000` and you're in.

---

## Usage

**Single Label**
1. Drop a label image (JPG, PNG, or WebP)
2. Optionally toggle on "Application Data" and fill in the fields you want to cross-check
3. Hit "Run Compliance Check"
4. Results show up on the right — overall status, extracted fields, and any violations broken out by error vs. warning

**Batch**
1. Drop up to 50 label images
2. Hit "Run Batch Check"
3. Summary row shows the breakdown at a glance
4. Click any row to expand and see the specific issues for that label

---

## API Endpoints

If you want to hit the backend directly:

`POST /api/analyze` — single label
- Form field: `label` (image file)
- Optional form field: `application_data` (JSON string with brand_name, class_type, alcohol_content, net_contents)

`POST /api/analyze-batch` — batch
- Form field: `labels` (up to 50 image files)

`GET /api/health` — sanity check

---

## Design Decisions & Trade-offs

**Why Claude for vision instead of a traditional CV pipeline?**
The previous scanning vendor pilot ran 30-40 seconds per label. The AI approach gets results back in 2-5 seconds with no custom model training required. It also handles imperfect images — skewed angles, glare, inconsistent lighting — without needing pre-processing. Dave's "it's obviously the same thing" problem (case differences that aren't real violations) is handled by the model's reasoning rather than brittle regex matching.

**Why Node.js instead of Python?**
Faster to prototype with for a REST API layer this thin. The actual AI call is just JSON in/out regardless of language.

**Sequential batch processing**
Batch jobs process labels one at a time to stay within API rate limits and keep the response predictable. For production you'd want a proper job queue (BullMQ, etc.) and streaming updates back to the UI.

**No auth / no persistence**
This is a proof-of-concept per Marcus's guidance. Production deployment would need auth, audit logging, document retention policies, and probably FedRAMP-compliant API endpoints.

**Government warning validation**
The full required warning text is baked into the system prompt so the model knows exactly what "exact match" means. Jenny's example about "Government Warning" in title case — that would get flagged here.

---

## Known Limitations

- Doesn't integrate with COLA — standalone tool per spec
- No streaming updates during batch processing (the whole batch completes, then results render)
- No export / download of results — would be a logical next step
- Image quality matters — extremely blurry or tiny text will hurt confidence scores
- Country of origin check is inferred from label content; it can't verify against an import registry

---

## Testing

A few ways to get test labels:

1. **TTB's public COLA registry** — `https://www.ttbonline.gov/colasonline/publicSearchColasBasic.do` has approved labels you can reference
2. **AI image generation** — Midjourney or DALL-E can produce realistic sample labels if you prompt for specific fields
3. The project brief includes a sample label spec (Old Tom Distillery, 45% ABV, 750mL Kentucky Straight Bourbon) if you want to mock one up manually

---

## If This Went to Production

Things I'd tackle before this touched real workloads:

- FedRAMP-compliant AI API or on-prem model deployment (firewall issue Marcus flagged)
- Job queue for batch with real-time progress updates
- COLA integration for pulling application data automatically instead of manual entry
- Audit log — every check stamped with timestamp, agent ID, label ID, result
- Confidence threshold tuning based on real agent feedback
- Export to CSV / PDF for review records
