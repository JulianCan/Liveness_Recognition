const express = require("express");
const router = express.Router();
const { pool } = require("../pool");

// LIST with pagination
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
  const offset = (page - 1) * limit;
  try {
    const { rows } = await pool.query(`SELECT * FROM questions ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
    res.json({ page, limit, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar questions" });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM questions WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "questions no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener questions" });
  }
});

router.post("/add", async (req, res) => {
  const { quiz_id, type, prompt, points } = req.body;
  if (!quiz_id || !type || !prompt) return res.status(400).json({ error: "quiz_id, type y prompt son obligatorios" });
  try {
    const q = await pool.query(
      `INSERT INTO questions (quiz_id, type, prompt, points)
       VALUES ($1,$2,$3,COALESCE($4,1)) RETURNING *`,
      [quiz_id, type, prompt, points]
    );
    res.status(201).json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al crear question" }); }
});

router.patch("/:id", async (req, res) => {
  try {
    const fields = []; const vals = [];
    for (const k of ["quiz_id","type","prompt","points"]) if (k in req.body) { vals.push(req.body[k]); fields.push(`${k}=$${vals.length}`); }
    if (!fields.length) return res.status(400).json({ error: "Nada para actualizar" });
    vals.push(req.params.id);
    const q = await pool.query(`UPDATE questions SET ${fields.join(", ")} WHERE id=$${vals.length} RETURNING *`, vals);
    if (!q.rowCount) return res.status(404).json({ error: "Question no encontrada" });
    res.json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al actualizar question" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const q = await pool.query(`DELETE FROM questions WHERE id=$1`, [req.params.id]);
    if (!q.rowCount) return res.status(404).json({ error: "Question no encontrada" });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al borrar question" }); }
});

module.exports = router;
