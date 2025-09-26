const express = require("express");
const router = express.Router();
const pool = require("../pool");

// LIST with pagination
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
  const offset = (page - 1) * limit;
  try {
    const { rows } = await pool.query(`SELECT * FROM quizzes ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
    res.json({ page, limit, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar quizzes" });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM quizzes WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "quizzes no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener quizzes" });
  }
});

router.post("/", async (req, res) => {
  const { lesson_id, title, time_limit_sec, attempts_allowed } = req.body;
  if (!lesson_id || !title) return res.status(400).json({ error: "lesson_id y title son obligatorios" });
  try {
    const q = await pool.query(
      `INSERT INTO quizzes (lesson_id, title, time_limit_sec, attempts_allowed)
       VALUES ($1,$2,$3,COALESCE($4,1)) RETURNING *`,
      [lesson_id, title, time_limit_sec || null, attempts_allowed]
    );
    res.status(201).json(q.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Ya existe quiz para esta lección" });
    console.error(e); res.status(500).json({ error: "Error al crear quiz" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const fields = []; const vals = [];
    for (const k of ["lesson_id","title","time_limit_sec","attempts_allowed"]) if (k in req.body) { vals.push(req.body[k]); fields.push(`${k}=$${vals.length}`); }
    if (!fields.length) return res.status(400).json({ error: "Nada para actualizar" });
    vals.push(req.params.id);
    const q = await pool.query(`UPDATE quizzes SET ${fields.join(", ")} WHERE id=$${vals.length} RETURNING *`, vals);
    if (!q.rowCount) return res.status(404).json({ error: "Quiz no encontrado" });
    res.json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al actualizar quiz" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const q = await pool.query(`DELETE FROM quizzes WHERE id=$1`, [req.params.id]);
    if (!q.rowCount) return res.status(404).json({ error: "Quiz no encontrado" });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al borrar quiz" }); }
});

module.exports = router;
