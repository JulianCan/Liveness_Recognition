const express = require("express");
const router = express.Router();
const { pool } = require("../pool");

// GET /api/courses
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
  const offset = (page - 1) * limit;

  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.title, c.slug, c.status, c.created_at,
              c.description, c.long_Description, c.cover_url  -- Asegúrate de que el nombre sea correcto
       FROM courses c
       JOIN users u ON u.id = c.owner_id
       ORDER BY c.id
       LIMIT $1 OFFSET $2`, [limit, offset]
    );

    console.log(rows);  // Verifica que los datos sean correctos

    res.json({ page, limit, data: rows });  // Asegúrate de enviar la respuesta correctamente
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar cursos" });
  }
});



// GET /api/courses/:id
router.get("/:id", async (req, res) => {
  try {
  const { rows } = await pool.query(
    `SELECT id, owner_id, title, slug, description, long_Description, cover_url, status, created_at
      FROM courses WHERE id = $1`, [req.params.id]
  );
    if (!rows.length) return res.status(404).json({ error: "Curso no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener curso" });
  }
});

// POST /api/courses
// body: { owner_id, title, slug, description, cover_url, status }
router.post("/add", async (req, res) => {
  const { owner_id, title, slug, description, cover_url, status } = req.body;
  if (!owner_id || !title || !slug) {
    return res.status(400).json({ error: "owner_id, title y slug son obligatorios" });
  }
  try {
    const q = await pool.query(
      `INSERT INTO courses (owner_id, title, slug, description, cover_url, status)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'draft'))
       RETURNING id, owner_id, title, slug, status, created_at`,
      [owner_id, title, slug, description || null, cover_url || null, status]
    );
    res.status(201).json(q.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Slug ya existe" });
    console.error(e);
    res.status(500).json({ error: "Error al crear curso" });
  }
});

// PATCH /api/courses/:id
router.patch("/:id", async (req, res) => {
  try {
    const fields = [];
    const vals = [];
    const allowed = ["owner_id","title","slug","description","cover_url","status"];
    for (const k of allowed) {
      if (k in req.body) { vals.push(req.body[k]); fields.push(`${k}=$${vals.length}`); }
    }
    if (!fields.length) return res.status(400).json({ error: "Nada para actualizar" });
    vals.push(req.params.id);
    const q = await pool.query(
      `UPDATE courses SET ${fields.join(", ")} WHERE id=$${vals.length}
       RETURNING id, owner_id, title, slug, status, created_at`, vals
    );
    if (!q.rowCount) return res.status(404).json({ error: "Curso no encontrado" });
    res.json(q.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Slug ya existe" });
    console.error(e);
    res.status(500).json({ error: "Error al actualizar curso" });
  }
});

// DELETE /api/courses/:id
router.delete("/:id", async (req, res) => {
  try {
    const q = await pool.query(`DELETE FROM courses WHERE id=$1`, [req.params.id]);
    if (!q.rowCount) return res.status(404).json({ error: "Curso no encontrado" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al borrar curso" });
  }
});

module.exports = router;
