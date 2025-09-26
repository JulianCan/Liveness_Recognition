const express = require("express");
const router = express.Router();
const pool = require("../pool");

// LIST with pagination
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
  const offset = (page - 1) * limit;
  try {
    const { rows } = await pool.query(`SELECT * FROM enrollments ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
    res.json({ page, limit, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar enrollments" });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM enrollments WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "enrollments no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener enrollments" });
  }
});

router.post("/", async (req, res) => {
  const { user_id, course_id, status, progress_pct } = req.body;
  if (!user_id || !course_id) return res.status(400).json({ error: "user_id y course_id son obligatorios" });
  try {
    const q = await pool.query(
      `INSERT INTO enrollments (user_id, course_id, status, progress_pct)
       VALUES ($1,$2,COALESCE($3,'active'),COALESCE($4,0)) RETURNING *`,
      [user_id, course_id, status, progress_pct]
    );
    res.status(201).json(q.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "El usuario ya está inscrito en el curso" });
    console.error(e); res.status(500).json({ error: "Error al crear enrollment" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const fields = []; const vals = [];
    for (const k of ["user_id","course_id","status","progress_pct"]) if (k in req.body) { vals.push(req.body[k]); fields.push(`${k}=$${vals.length}`); }
    if (!fields.length) return res.status(400).json({ error: "Nada para actualizar" });
    vals.push(req.params.id);
    const q = await pool.query(`UPDATE enrollments SET ${fields.join(", ")} WHERE id=$${vals.length} RETURNING *`, vals);
    if (!q.rowCount) return res.status(404).json({ error: "Enrollment no encontrado" });
    res.json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al actualizar enrollment" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const q = await pool.query(`DELETE FROM enrollments WHERE id=$1`, [req.params.id]);
    if (!q.rowCount) return res.status(404).json({ error: "Enrollment no encontrado" });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al borrar enrollment" }); }
});

module.exports = router;
