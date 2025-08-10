const express = require("express");
const router = express.Router();

// POST /api/access/verify  { code: "..." }
router.post("/verify", (req, res) => {
  try {
    const provided = (req.body?.code || "").trim();
    const expected  = process.env.ACCESS_CODE || "";
    if (!expected) return res.status(500).json({ error: "Access code not configured" });

    if (provided && provided === expected) {
      return res.json({ ok: true });
    }
    return res.status(401).json({ ok: false, error: "Invalid code" });
  } catch (err) {
    console.error("Access verify error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
