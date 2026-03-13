import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      "http://localhost:5173",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (!origin || allowed.includes(origin) || origin.endsWith(".onrender.com")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
}));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post("/api/analyze", async (req, res) => {
  const { companyName } = req.body;

  if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
    return res.status(400).json({ error: "companyName is required." });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            'Return ONLY a JSON object with: { "company": string, "description": string, "industry": string, "keywords": string[] }. The description should be a professional 1-sentence summary. Provide 5 relevant keywords.',
        },
        {
          role: "user",
          content: `Analyze the company: ${companyName.trim()}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleaned);

    return res.json(data);
  } catch (err) {
    console.error("Groq error:", err.message);

    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: "Failed to parse AI response." });
    }

    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

