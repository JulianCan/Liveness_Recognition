const express = require("express");
const router = express.Router();
const { pool } = require("../pool");

// LIST with pagination
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
  const offset = (page - 1) * limit;
  try {
    const { rows } = await pool.query(`SELECT * FROM modules ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
    res.json({ page, limit, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar modules" });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM modules WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "modules no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener modules" });
  }
});

// GET by courseId (to include 'duracion' in response)
router.get("/by-course/:courseId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, course_id, title, position, duracion 
       FROM modules 
       WHERE course_id = $1 
       ORDER BY COALESCE(position, 9999), id`, 
      [req.params.courseId]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar módulos del curso" });
  }
});


// CREATE
router.post("/add", async (req, res) => {
  const { course_id, title, position, duracion } = req.body;  // Include 'duracion' here
  if (!course_id || !title || !duracion) return res.status(400).json({ error: "course_id, title y duracion son obligatorios" });
  try {
    const q = await pool.query(
      `INSERT INTO modules (course_id, title, position, duracion) VALUES ($1, $2, COALESCE($3, 1), $4) RETURNING *`,
      [course_id, title, position, duracion]
    );
    res.status(201).json(q.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al crear module" });
  }
});

// UPDATE (PATCH)
router.patch("/:id", async (req, res) => {
  try {
    const fields = []; const vals = [];
    for (const k of ["course_id", "title", "position", "duracion"]) {
      if (k in req.body) {
        vals.push(req.body[k]);
        fields.push(`${k}=$${vals.length}`);
      }
    }
    if (!fields.length) return res.status(400).json({ error: "Nada para actualizar" });
    vals.push(req.params.id);
    const q = await pool.query(`UPDATE modules SET ${fields.join(", ")} WHERE id=$${vals.length} RETURNING *`, vals);
    if (!q.rowCount) return res.status(404).json({ error: "Module no encontrado" });
    res.json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al actualizar module" }); }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const q = await pool.query(`DELETE FROM modules WHERE id=$1`, [req.params.id]);
    if (!q.rowCount) return res.status(404).json({ error: "Module no encontrado" });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al borrar module" }); }
});

module.exports = router;
