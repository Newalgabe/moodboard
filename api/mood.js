// Vercel serverless function: POST /api/mood  { content, vision }  ->  { content }
// Env: GROQ_API_KEY (required). Optional overrides: GROQ_TEXT_MODEL, GROQ_VISION_MODEL.
// Without overrides, the function asks Groq which models this key can use and picks one.
const BASE = "https://api.groq.com/openai/v1";
const hits = new Map(); // best-effort per-instance rate limit; use Upstash/Vercel KV for a hard limit
let cache = { at: 0, ids: [] };

async function models() {
  if (Date.now() - cache.at < 3600e3 && cache.ids.length) return cache.ids;
  const r = await fetch(BASE + "/models", { headers: { Authorization: "Bearer " + process.env.GROQ_API_KEY } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error("models"), { status: r.status });
  const ids = (d.data || [])
    .map((m) => m.id)
    .filter((id) => !/whisper|tts|guard|embed|moderation|prompt-guard|orpheus|playai/i.test(id));
  cache = { at: Date.now(), ids };
  return ids;
}

function pick(ids, vision) {
  const want = vision
    ? [/qwen.*3\.8/i, /llama-4-maverick/i, /llama-4-scout/i, /vision|llava|qwen.*vl/i]
    : [/llama-3\.3-70b/i, /gpt-oss-120b/i, /llama-4-maverick/i, /qwen/i, /llama-3\.1-70b/i, /gpt-oss/i, /llama-4-scout/i, /llama-3\.1-8b/i, /llama/i];
  for (const re of want) {
    const m = ids.find((id) => re.test(id));
    if (m) return m;
  }
  return vision ? null : ids[0] || null;
}

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
    let model = vision ? process.env.GROQ_VISION_MODEL : process.env.GROQ_TEXT_MODEL;
    if (!model) {
      model = pick(await models(), !!vision);
      if (!model) return res.status(503).json({ error: "No suitable model available" });
    }
    const r = await fetch(BASE + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.GROQ_API_KEY },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content }],
        response_format: { type: "json_object" },
        temperature: 0.8,
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("groq error", r.status, d.error && d.error.message);
      if (r.status === 404 || /model/i.test((d.error && d.error.message) || "")) cache = { at: 0, ids: [] };
      return res.status(r.status === 401 ? 500 : r.status).json({ error: (d.error && d.error.message) || "Upstream error" });
    }
    res.status(200).json({ content: (d.choices && d.choices[0].message.content) || "" });
  } catch (e) {
    console.error("mood error", e.message);
    res.status(e.status === 401 ? 500 : 502).json({ error: "Upstream unreachable" });
  }
};
