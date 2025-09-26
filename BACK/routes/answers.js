const express = require("express");
const router = express.Router();
const pool = require("../pool");

// LIST with pagination
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
  const offset = (page - 1) * limit;
  try {
    const { rows } = await pool.query(`SELECT * FROM answers ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
    res.json({ page, limit, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar answers" });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM answers WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "answers no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener answers" });
  }
});

router.post("/", async (req, res) => {
  const { attempt_id, question_id, option_id, text_answer } = req.body;
  if (!attempt_id || !question_id) return res.status(400).json({ error: "attempt_id y question_id son obligatorios" });
  try {
    const q = await pool.query(
      `INSERT INTO answers (attempt_id, question_id, option_id, text_answer)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [attempt_id, question_id, option_id || null, text_answer || null]
    );
    res.status(201).json(q.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Ya existe respuesta para esa pregunta en el intento" });
    console.error(e); res.status(500).json({ error: "Error al crear answer" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const fields = []; const vals = [];
    for (const k of ["option_id","text_answer"]) if (k in req.body) { vals.push(req.body[k]); fields.push(`${k}=$${vals.length}`); }
    if (!fields.length) return res.status(400).json({ error: "Nada para actualizar" });
    vals.push(req.params.id);
    const q = await pool.query(`UPDATE answers SET ${fields.join(", ")} WHERE id=$${vals.length} RETURNING *`, vals);
    if (!q.rowCount) return res.status(404).json({ error: "Answer no encontrado" });
    res.json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al actualizar answer" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const q = await pool.query(`DELETE FROM answers WHERE id=$1`, [req.params.id]);
    if (!q.rowCount) return res.status(404).json({ error: "Answer no encontrado" });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al borrar answer" }); }
});

module.exports = router;
