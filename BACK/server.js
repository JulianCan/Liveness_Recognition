// BACK/server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Importar routers
const usersRouter = require("./routes/users");

// Inicializar app
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas de prueba / salud
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "✅ Backend funcionando",
    time: new Date().toISOString(),
  });
});

// Montar routers
app.use("/api/users", usersRouter);

// Futuro: aquí agregas más, ej.
// const coursesRouter = require("./routes/courses");
// app.use("/api/courses", coursesRouter);

// Arrancar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
