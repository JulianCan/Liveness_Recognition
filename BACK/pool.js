// pool.js
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: __dirname + '/.env' });

// Mostrar variables críticas para debug (puedes comentar después)
console.log('Connecting with user:', process.env.PG_USER);
console.log('Connecting with password:', typeof process.env.PG_PASSWORD, process.env.PG_PASSWORD);

// Crear pool de conexiones PostgreSQL
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: {
    rejectUnauthorized: false // Permite conectarse a Azure PostgreSQL sin certificados locales
  }
});

// Función para probar la conexión
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL Connected successfully!');
    client.release(); // Liberar conexión al pool
  } catch (err) {
    console.error('PostgreSQL Connection Error:', err);
    process.exit(1); // Salir si falla la conexión
  }
};

// Exportar el pool y la función de conexión
module.exports = { pool, connectDB };
