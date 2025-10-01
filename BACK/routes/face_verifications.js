const express = require("express");
const router = express.Router();
const { pool } = require("../pool");

// LIST with pagination
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
  const offset = (page - 1) * limit;
  try {
    const { rows } = await pool.query(`SELECT * FROM face_verifications ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
    res.json({ page, limit, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar face_verifications" });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM face_verifications WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "face_verifications no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener face_verifications" });
  }
});

router.post("/add", async (req, res) => {
  const { user_id, request_id, status, confidence, provider } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id es obligatorio" });
  try {
    const q = await pool.query(
      `INSERT INTO face_verifications (user_id, request_id, status, confidence, provider)
       VALUES ($1,$2,COALESCE($3,'pending'),$4,COALESCE($5,'azure_face')) RETURNING *`,
      [user_id, request_id || null, status, confidence || null, provider || null]
    );
    res.status(201).json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al crear face_verification" }); }
});

router.patch("/:id", async (req, res) => {
  try {
    const fields = []; const vals = [];
    for (const k of ["status","confidence","request_id","provider"]) if (k in req.body) { vals.push(req.body[k]); fields.push(`${k}=$${vals.length}`); }
    if (!fields.length) return res.status(400).json({ error: "Nada para actualizar" });
    vals.push(req.params.id);
    const q = await pool.query(`UPDATE face_verifications SET ${fields.join(", ")} WHERE id=$${vals.length} RETURNING *`, vals);
    if (!q.rowCount) return res.status(404).json({ error: "face_verification no encontrada" });
    res.json(q.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al actualizar face_verification" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const q = await pool.query(`DELETE FROM face_verifications WHERE id=$1`, [req.params.id]);
    if (!q.rowCount) return res.status(404).json({ error: "face_verification no encontrada" });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Error al borrar face_verification" }); }
});

module.exports = router;
