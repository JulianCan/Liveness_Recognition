const express = require("express");
const router = express.Router();
const { pool } = require("../pool");

// LIST with pagination
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
  const offset = (page - 1) * limit;
  try {
    const { rows } = await pool.query(`SELECT * FROM attempts ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
    res.json({ page, limit, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar attempts" });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM attempts WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "attempts no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener attempts" });
  }
});

router.post("/add", async (req, res) => {
  const { quiz_id, user_id } = req.body;
  if (!quiz_id || !user_id) return res.status(400).json({ error: "quiz_id y user_id son obligatorios" });
  try {
    const q = await pool.query(
      `INSERT INTO attempts (quiz_id, user_id) VALUES ($1,$2) RETURNING *`,
      [quiz_id, user_id]
    );
    res.status(201).json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al crear attempt" }); }
});

router.patch("/:id/submit", async (req, res) => {
  const { score } = req.body;
  try {
    const q = await pool.query(
      `UPDATE attempts SET submitted_at = now(), score = $1 WHERE id=$2 RETURNING *`,
      [score, req.params.id]
    );
    if (!q.rowCount) return res.status(404).json({ error: "Attempt no encontrado" });
    res.json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al enviar attempt" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const q = await pool.query(`DELETE FROM attempts WHERE id=$1`, [req.params.id]);
    if (!q.rowCount) return res.status(404).json({ error: "Attempt no encontrado" });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al borrar attempt" }); }
});

module.exports = router;
