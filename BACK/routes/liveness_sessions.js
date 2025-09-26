const express = require("express");
const router = express.Router();
const pool = require("../pool");

// LIST with pagination
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
  const offset = (page - 1) * limit;
  try {
    const { rows } = await pool.query(`SELECT * FROM liveness_sessions ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
    res.json({ page, limit, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar liveness_sessions" });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM liveness_sessions WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "liveness_sessions no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener liveness_sessions" });
  }
});

router.post("/", async (req, res) => {
  const { user_id, video_url, provider, provider_metadata } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id es obligatorio" });
  try {
    const q = await pool.query(
      `INSERT INTO liveness_sessions (user_id, video_url, provider, provider_metadata)
       VALUES ($1,$2,COALESCE($3,'azure_face'),$4) RETURNING *`,
      [user_id, video_url || null, provider || null, provider_metadata || null]
    );
    res.status(201).json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al crear liveness_session" }); }
});

router.patch("/:id", async (req, res) => {
  try {
    const fields = []; const vals = [];
    for (const k of ["status","video_url","provider","provider_metadata","completed_at"]) if (k in req.body) { vals.push(req.body[k]); fields.push(`${k}=$${vals.length}`); }
    if (!fields.length) return res.status(400).json({ error: "Nada para actualizar" });
    vals.push(req.params.id);
    const q = await pool.query(`UPDATE liveness_sessions SET ${fields.join(", ")} WHERE id=$${vals.length} RETURNING *`, vals);
    if (!q.rowCount) return res.status(404).json({ error: "liveness_session no encontrada" });
    res.json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al actualizar liveness_session" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const q = await pool.query(`DELETE FROM liveness_sessions WHERE id=$1`, [req.params.id]);
    if (!q.rowCount) return res.status(404).json({ error: "liveness_session no encontrada" });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al borrar liveness_session" }); }
});

module.exports = router;
