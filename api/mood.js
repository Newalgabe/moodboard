// Vercel serverless function: POST /api/mood  { content, vision }  ->  { content }
// Set GROQ_API_KEY in Vercel project settings. Optional: GROQ_TEXT_MODEL, GROQ_VISION_MODEL.
const TEXT = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";
const VISION = process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";
const hits = new Map(); // best-effort per-instance rate limit; use Upstash/Vercel KV for a hard limit

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const ip = String(req.headers["x-forwarded-for"] || "x").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (recent.length >= 12) return res.status(429).json({ error: "Rate limit" });
  recent.push(now);
  hits.set(ip, recent);

  const { content, vision } = req.body || {};
  const okText = typeof content === "string" && content.length <= 12000;
  const okVision = vision && Array.isArray(content) && JSON.stringify(content).length < 4e6;
  if (!okText && !okVision) return res.status(400).json({ error: "Bad request" });
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: "Server not configured" });

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.GROQ_API_KEY },
      body: JSON.stringify({
        model: vision ? VISION : TEXT,
        messages: [{ role: "user", content }],
        response_format: { type: "json_object" },
        temperature: 0.8,
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: (d.error && d.error.message) || "Upstream error" });
    res.status(200).json({ content: (d.choices && d.choices[0].message.content) || "" });
  } catch (e) {
    res.status(502).json({ error: "Upstream unreachable" });
  }
};
