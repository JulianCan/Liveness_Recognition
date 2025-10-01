const express = require("express");
const router = express.Router();
const { pool } = require("../pool");

// LIST with pagination
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
  const offset = (page - 1) * limit;
  try {
    const { rows } = await pool.query(`SELECT * FROM media ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
    res.json({ page, limit, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar media" });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM media WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "media no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener media" });
  }
});

router.post("/add", async (req, res) => {
  const { owner_id, url, type, size_bytes, checksum } = req.body;
  if (!owner_id || !url || !type) return res.status(400).json({ error: "owner_id, url y type son obligatorios" });
  try {
    const q = await pool.query(
      `INSERT INTO media (owner_id, url, type, size_bytes, checksum)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [owner_id, url, type, size_bytes || null, checksum || null]
    );
    res.status(201).json(q.rows[0]);
  } catch (e) {
    if (e.code === "23503") {
      return res.status(400).json({ error: "El owner_id proporcionado no existe" });
    }
    console.error(e); res.status(500).json({ error: "Error al crear media" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const fields = []; const vals = [];
    for (const k of ["owner_id","url","type","size_bytes","checksum"]) if (k in req.body) { vals.push(req.body[k]); fields.push(`${k}=$${vals.length}`); }
    if (!fields.length) return res.status(400).json({ error: "Nada para actualizar" });
    vals.push(req.params.id);
    const q = await pool.query(`UPDATE media SET ${fields.join(", ")} WHERE id=$${vals.length} RETURNING *`, vals);
    if (!q.rowCount) return res.status(404).json({ error: "Media no encontrada" });
    res.json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al actualizar media" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const q = await pool.query(`DELETE FROM media WHERE id=$1`, [req.params.id]);
    if (!q.rowCount) return res.status(404).json({ error: "Media no encontrada" });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al borrar media" }); }
});

module.exports = router;
