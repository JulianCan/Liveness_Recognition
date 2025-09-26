const express = require("express");
const router = express.Router();
const pool = require("../pool");

// LIST with pagination
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
  const offset = (page - 1) * limit;
  try {
    const { rows } = await pool.query(`SELECT * FROM lessons ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
    res.json({ page, limit, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar lessons" });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM lessons WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "lessons no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener lessons" });
  }
});

router.post("/", async (req, res) => {
  const { module_id, title, content_html, video_url, position, is_exam_intro } = req.body;
  if (!module_id || !title) return res.status(400).json({ error: "module_id y title son obligatorios" });
  try {
    const q = await pool.query(
      `INSERT INTO lessons (module_id, title, content_html, video_url, position, is_exam_intro)
       VALUES ($1,$2,$3,$4,COALESCE($5,1),COALESCE($6,false)) RETURNING *`,
      [module_id, title, content_html || null, video_url || null, position, is_exam_intro]
    );
    res.status(201).json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al crear lesson" }); }
});

router.patch("/:id", async (req, res) => {
  try {
    const fields = []; const vals = [];
    for (const k of ["module_id","title","content_html","video_url","position","is_exam_intro"]) if (k in req.body) { vals.push(req.body[k]); fields.push(`${k}=$${vals.length}`); }
    if (!fields.length) return res.status(400).json({ error: "Nada para actualizar" });
    vals.push(req.params.id);
    const q = await pool.query(`UPDATE lessons SET ${fields.join(", ")} WHERE id=$${vals.length} RETURNING *`, vals);
    if (!q.rowCount) return res.status(404).json({ error: "Lesson no encontrada" });
    res.json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al actualizar lesson" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const q = await pool.query(`DELETE FROM lessons WHERE id=$1`, [req.params.id]);
    if (!q.rowCount) return res.status(404).json({ error: "Lesson no encontrada" });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al borrar lesson" }); }
});

module.exports = router;
