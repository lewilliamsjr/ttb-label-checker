const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const client = new Anthropic();

app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `You are a TTB (Alcohol and Tobacco Tax and Trade Bureau) label compliance specialist. 
Your job is to verify alcohol beverage labels against TTB requirements.

When analyzing a label, extract and verify these required fields:
1. Brand Name - must be clearly visible
2. Class/Type Designation - e.g., "Kentucky Straight Bourbon Whiskey", "Cabernet Sauvignon", etc.
3. Alcohol Content - percentage by volume (e.g., "40% Alc./Vol.")
4. Net Contents - volume in mL or oz (e.g., "750 mL")
5. Name and Address of Bottler/Producer
6. Country of Origin (required for imports)
7. Government Warning Statement - MUST appear verbatim:
   "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems."
   - "GOVERNMENT WARNING:" must be in ALL CAPS and bold
   - The full text must be present, word-for-word

When comparing label fields to application data (if provided), note:
- Case differences that are clearly the same (e.g., "STONE'S THROW" vs "Stone's Throw") should be flagged as warnings, not hard failures
- ABV must match exactly
- Brand name must match (case-insensitive comparison acceptable)
- Government warning must be exact

Return your analysis as valid JSON only, no markdown, no explanation outside the JSON:
{
  "overall_status": "APPROVED" | "NEEDS_REVIEW" | "REJECTED",
  "confidence": 0-100,
  "extracted_fields": {
    "brand_name": { "value": "...", "found": true/false },
    "class_type": { "value": "...", "found": true/false },
    "alcohol_content": { "value": "...", "found": true/false },
    "net_contents": { "value": "...", "found": true/false },
    "bottler_info": { "value": "...", "found": true/false },
    "country_of_origin": { "value": "...", "found": true/false, "required": true/false },
    "government_warning": { 
      "found": true/false, 
      "exact_match": true/false,
      "issues": [] 
    }
  },
  "violations": [
    { "field": "...", "severity": "ERROR" | "WARNING", "description": "..." }
  ],
  "notes": "..."
}`;

async function analyzeLabel(imageBuffer, mimeType, applicationData = null) {
  const messages = [];
  
  let userContent = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: mimeType,
        data: imageBuffer.toString("base64"),
      },
    },
    {
      type: "text",
      text: applicationData
        ? `Analyze this alcohol beverage label for TTB compliance. Also compare against this application data:\n\n${JSON.stringify(applicationData, null, 2)}\n\nReturn JSON only.`
        : "Analyze this alcohol beverage label for TTB compliance. Extract all required fields and flag any issues. Return JSON only.",
    },
  ];

  messages.push({ role: "user", content: userContent });

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages,
  });

  const rawText = response.content[0].text.trim();
  
  // Strip any accidental markdown fences
  const jsonText = rawText.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(jsonText);
}

// Single label analysis
app.post("/api/analyze", upload.single("label"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const mimeType = req.file.mimetype;
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType)) {
      return res.status(400).json({ error: "Invalid file type. Use JPEG, PNG, GIF, or WebP." });
    }

    let applicationData = null;
    if (req.body.application_data) {
      try {
        applicationData = JSON.parse(req.body.application_data);
      } catch {
        // ignore malformed JSON, just analyze the label alone
      }
    }

    const result = await analyzeLabel(req.file.buffer, mimeType, applicationData);
    
    res.json({
      success: true,
      filename: req.file.originalname,
      analysis: result,
    });
  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).json({ error: "Analysis failed: " + err.message });
  }
});

// Batch label analysis
app.post("/api/analyze-batch", upload.array("labels", 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No image files provided" });
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");

    const results = [];
    
    // Process sequentially to respect rate limits, stream each result back
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        const mimeType = file.mimetype;
        if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType)) {
          results.push({
            filename: file.originalname,
            success: false,
            error: "Invalid file type",
            index: i,
          });
          continue;
        }

        const result = await analyzeLabel(file.buffer, mimeType);
        results.push({
          filename: file.originalname,
          success: true,
          analysis: result,
          index: i,
        });
      } catch (err) {
        results.push({
          filename: file.originalname,
          success: false,
          error: err.message,
          index: i,
        });
      }
    }

    res.json({ success: true, total: req.files.length, results });
  } catch (err) {
    console.error("Batch error:", err);
    res.status(500).json({ error: "Batch analysis failed: " + err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`TTB Label Checker backend running on port ${PORT}`);
});
