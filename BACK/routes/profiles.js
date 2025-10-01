const express = require("express");
const router = express.Router();

// 👇 usa la MISMA ruta de import que tengas en users.js
const { pool } = require("../pool"); // o "../pool" si así lo usas

// Helpers simples de validación
const isUrl = (v) => {
  if (!v) return true;
  try { new URL(v); return true; } catch { return false; }
};
const isPhone = (v) => !v || /^[0-9]{7,15}$/.test(v); // 7-15 dígitos
const isDocId = (v) => !v || /^[0-9A-Za-z._-]{3,30}$/.test(v); // doc básico
const isCountry = (v) => !v || (typeof v === "string" && v.length <= 60);

// LISTAR (paginado)  GET /api/profiles?page=&limit=
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
  const offset = (page - 1) * limit;

  try {
    const { rows } = await pool.query(
      `SELECT user_id, avatar_url, document_id, phone, country
       FROM profiles
       ORDER BY user_id
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ page, limit, data: rows });
  } catch (e) {
    console.error("Error al listar perfiles:", e);
    res.status(500).json({ error: "Error al listar perfiles" });
  }
});

// OBTENER por user_id  GET /api/profiles/:userId
router.get("/:userId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT user_id, avatar_url, document_id, phone, country
       FROM profiles
       WHERE user_id = $1`,
      [req.params.userId]
    );
    if (!rows.length) return res.status(404).json({ error: "Perfil no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error("Error al obtener perfil:", e);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

// CREAR  POST /api/profiles
// body: { user_id, avatar_url?, document_id?, phone?, country? }
router.post("/add", async (req, res) => {
  try {
    const { user_id, avatar_url, document_id, phone, country } = req.body;

    if (!user_id) return res.status(400).json({ error: "user_id es obligatorio" });
    if (!isUrl(avatar_url)) return res.status(400).json({ error: "avatar_url inválida" });
    if (!isPhone(phone)) return res.status(400).json({ error: "phone inválido (7-15 dígitos)" });
    if (!isDocId(document_id)) return res.status(400).json({ error: "document_id inválido" });
    if (!isCountry(country)) return res.status(400).json({ error: "country inválido" });

    const sql = `
      INSERT INTO profiles (user_id, avatar_url, document_id, phone, country)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id, avatar_url, document_id, phone, country
    `;
    const params = [user_id, avatar_url || null, document_id || null, phone || null, country || null];

    const { rows } = await pool.query(sql, params);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === "23505") {
      // PK duplicada (ya existe perfil para ese user_id)
      return res.status(409).json({ error: "Ese usuario ya tiene perfil" });
    }
    if (e.code === "23503") {
      // FK violada (si tienes FK a users)
      return res.status(400).json({ error: "user_id no existe en users" });
    }
    console.error("Error al crear perfil:", e);
    res.status(500).json({ error: "Error al crear perfil" });
  }
});

// REEMPLAZO TOTAL  PUT /api/profiles/:userId
router.put("/:userId", async (req, res) => {
  try {
    const { avatar_url, document_id, phone, country } = req.body;

    if (!isUrl(avatar_url)) return res.status(400).json({ error: "avatar_url inválida" });
    if (!isPhone(phone)) return res.status(400).json({ error: "phone inválido (7-15 dígitos)" });
    if (!isDocId(document_id)) return res.status(400).json({ error: "document_id inválido" });
    if (!isCountry(country)) return res.status(400).json({ error: "country inválido" });

    const sql = `
      UPDATE profiles
      SET avatar_url = $1, document_id = $2, phone = $3, country = $4
      WHERE user_id = $5
      RETURNING user_id, avatar_url, document_id, phone, country
    `;
    const params = [avatar_url || null, document_id || null, phone || null, country || null, req.params.userId];

    const upd = await pool.query(sql, params);
    if (!upd.rowCount) return res.status(404).json({ error: "Perfil no encontrado" });
    res.json(upd.rows[0]);
  } catch (e) {
    console.error("Error al actualizar perfil (PUT):", e);
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
});

// ACTUALIZACIÓN PARCIAL  PATCH /api/profiles/:userId
router.patch("/:userId", async (req, res) => {
  try {
    const allowed = ["avatar_url", "document_id", "phone", "country"];
    const sets = [];
    const values = [];

    for (const key of allowed) {
      if (key in req.body) {
        const val = req.body[key];

        if (key === "avatar_url" && !isUrl(val)) {
          return res.status(400).json({ error: "avatar_url inválida" });
        }
        if (key === "phone" && !isPhone(val)) {
          return res.status(400).json({ error: "phone inválido (7-15 dígitos)" });
        }
        if (key === "document_id" && !isDocId(val)) {
          return res.status(400).json({ error: "document_id inválido" });
        }
        if (key === "country" && !isCountry(val)) {
          return res.status(400).json({ error: "country inválido" });
        }

        values.push(val || null);
        sets.push(`${key} = $${values.length}`);
      }
    }

    if (!sets.length) return res.status(400).json({ error: "No hay campos para actualizar" });

    values.push(req.params.userId);
    const upd = await pool.query(
      `UPDATE profiles SET ${sets.join(", ")} WHERE user_id = $${values.length}
       RETURNING user_id, avatar_url, document_id, phone, country`,
      values
    );

    if (!upd.rowCount) return res.status(404).json({ error: "Perfil no encontrado" });
    res.json(upd.rows[0]);
  } catch (e) {
    console.error("Error al actualizar perfil (PATCH):", e);
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
});

// ELIMINAR  DELETE /api/profiles/:userId
router.delete("/:userId", async (req, res) => {
  try {
    const del = await pool.query(`DELETE FROM profiles WHERE user_id = $1`, [req.params.userId]);
    if (!del.rowCount) return res.status(404).json({ error: "Perfil no encontrado" });
    res.json({ ok: true });
  } catch (e) {
    console.error("Error al eliminar perfil:", e);
    res.status(500).json({ error: "Error al eliminar perfil" });
  }
});

module.exports = router;
