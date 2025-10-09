// BACK/routes/users.js
const express = require("express");
const router = express.Router();
const { pool } = require("../pool"); // <--- cambiar a destructuring
const bcrypt = require('bcrypt');
const saltRounds = 10; // Número de rondas para el hash

// Helpers
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// GET /api/users  (lista con paginación básica ?page=1&limit=20)
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
  const offset = (page - 1) * limit;

  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, created_at
       FROM users
       ORDER BY id
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ page, limit, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar usuarios" });
  }
});

// GET /api/users/:id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, created_at FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

// POST /api/users  {name, email, password_hash, role}
router.post("/add", async (req, res) => {  // Aquí debe coincidir "add"
  try {
    const { name, email, password_hash, role } = req.body;

    if (!name || !email || !password_hash) {
      return res.status(400).json({ error: "name, email y password_hash son obligatorios" });
    }

    // Cifrar la contraseña
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    if (!isEmail(email)) return res.status(400).json({ error: "Email inválido" });
    if (role && !["admin", "teacher", "student"].includes(role)) {
      return res.status(400).json({ error: "role debe ser admin|teacher|student" });
    }

    const insert = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, COALESCE($4,'student'))
       RETURNING id, name, email, role, created_at`,
      [name, email, password_hash, role]
    );
    res.status(201).json(insert.rows[0]);
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ error: "El email ya está registrado" });
    }
    console.error(e);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// POST /api/users/login {email, password}
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son requeridos" });
  }

  try {
    // Buscar al usuario por email
    const { rows } = await pool.query(
      `SELECT id, name, email, password_hash, role FROM users WHERE email = $1`,
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Comparar la contraseña proporcionada con el hash almacenado
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // Si las credenciales son correctas, devolver los datos del usuario
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});



// PUT /api/users/:id  (reemplazo total)
router.put("/:id", async (req, res) => {
  try {
    const { name, email, password_hash, role } = req.body;
    if (!name || !email || !password_hash || !role) {
      return res.status(400).json({ error: "Faltan campos (name, email, password_hash, role)" });
    }
    if (!isEmail(email)) return res.status(400).json({ error: "Email inválido" });
    if (!["admin", "teacher", "student"].includes(role)) {
      return res.status(400).json({ error: "role debe ser admin|teacher|student" });
    }

    const upd = await pool.query(
      `UPDATE users
       SET name=$1, email=$2, password_hash=$3, role=$4
       WHERE id=$5
       RETURNING id, name, email, role, created_at`,
      [name, email, password_hash, role, req.params.id]
    );
    if (!upd.rowCount) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(upd.rows[0]);
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ error: "El email ya está registrado" });
    }
    console.error(e);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// PATCH /api/users/:id  (actualización parcial)
router.patch("/:id", async (req, res) => {
  try {
    const fields = [];
    const values = [];
    const allowed = ["name", "email", "password_hash", "role"];

    for (const key of allowed) {
      if (key in req.body) {
        if (key === "email" && !isEmail(req.body[key])) {
          return res.status(400).json({ error: "Email inválido" });
        }
        if (key === "role" && !["admin", "teacher", "student"].includes(req.body[key])) {
          return res.status(400).json({ error: "role debe ser admin|teacher|student" });
        }
        values.push(req.body[key]);
        fields.push(`${key} = $${values.length}`);
      }
    }
    if (!fields.length) return res.status(400).json({ error: "No hay campos para actualizar" });

    values.push(req.params.id); // where id
    const upd = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${values.length}
       RETURNING id, name, email, role, created_at`,
      values
    );
    if (!upd.rowCount) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(upd.rows[0]);
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ error: "El email ya está registrado" });
    }
    console.error(e);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// DELETE /api/users/:id
router.delete("/:id", async (req, res) => {
  try {
    const del = await pool.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
    if (!del.rowCount) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

module.exports = router;
