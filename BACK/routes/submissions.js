const express = require("express");
const router = express.Router();
const pool = require("../pool");

// LIST with pagination
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
  const offset = (page - 1) * limit;
  try {
    const { rows } = await pool.query(`SELECT * FROM submissions ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
    res.json({ page, limit, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar submissions" });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM submissions WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "submissions no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener submissions" });
  }
});

router.post("/", async (req, res) => {
  const { lesson_id, user_id, file_url, grade, feedback } = req.body;
  if (!lesson_id || !user_id || !file_url) return res.status(400).json({ error: "lesson_id, user_id y file_url son obligatorios" });
  try {
    const q = await pool.query(
      `INSERT INTO submissions (lesson_id, user_id, file_url, grade, feedback)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [lesson_id, user_id, file_url, grade || null, feedback || null]
    );
    res.status(201).json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al crear submission" }); }
});

router.patch("/:id", async (req, res) => {
  try {
    const fields = []; const vals = [];
    for (const k of ["lesson_id","user_id","file_url","grade","feedback"]) if (k in req.body) { vals.push(req.body[k]); fields.push(`${k}=$${vals.length}`); }
    if (!fields.length) return res.status(400).json({ error: "Nada para actualizar" });
    vals.push(req.params.id);
    const q = await pool.query(`UPDATE submissions SET ${fields.join(", ")} WHERE id=$${vals.length} RETURNING *`, vals);
    if (!q.rowCount) return res.status(404).json({ error: "Submission no encontrada" });
    res.json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al actualizar submission" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const q = await pool.query(`DELETE FROM submissions WHERE id=$1`, [req.params.id]);
    if (!q.rowCount) return res.status(404).json({ error: "Submission no encontrada" });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al borrar submission" }); }
});

module.exports = router;
