// Vercel serverless function: GET /api/itunes?term=...  (replaces browser JSONP)
module.exports = async (req, res) => {
  const term = String(req.query.term || "").slice(0, 200);
  if (!term) return res.status(400).json({ error: "term required" });
  try {
    const r = await fetch("https://itunes.apple.com/search?entity=song&limit=10&term=" + encodeURIComponent(term));
    const d = await r.json();
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    res.status(200).json(d);
  } catch (e) {
    res.status(502).json({ error: "Upstream unreachable" });
  }
};
