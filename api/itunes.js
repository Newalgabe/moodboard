// Vercel serverless function: GET /api/itunes?term=...&limit=25&country=tr&attribute=songTerm
module.exports = async (req, res) => {
  const term = String(req.query.term || "").slice(0, 200);
  if (!term) return res.status(400).json({ error: "term required" });
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const country = /^[a-z]{2}$/i.test(String(req.query.country || "")) ? String(req.query.country).toLowerCase() : "";
  const attribute = ["songTerm", "artistTerm"].includes(req.query.attribute) ? req.query.attribute : "";
  const url =
    "https://itunes.apple.com/search?entity=song&limit=" + limit +
    "&term=" + encodeURIComponent(term) +
    (country ? "&country=" + country : "") +
    (attribute ? "&attribute=" + attribute : "");
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: "Upstream error" });
    const d = await r.json();
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    res.status(200).json(d);
  } catch (e) {
    res.status(502).json({ error: "Upstream unreachable" });
  }
};
