// BACK/pool.js

const { Pool } = require('pg');

const pool = new Pool({

  // USAR LA CADENA DE CONEXIÓN COMPLETA:
  connectionString: process.env.DATABASE_URL, 
  
  ssl: {
    // Esto es NECESARIO para que Vercel se conecte a Supabase
    rejectUnauthorized: false
  }
});

// ----------------------------------------------------------------------
// FUNCIÓN PARA PROBAR LA CONEXIÓN
// ----------------------------------------------------------------------
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL Connected successfully!');
    client.release(); // Liberar conexión al pool
  } catch (err) {
    console.error('❌ PostgreSQL Connection Error:', err.message, err.code, err.hostname);
    // ⚠️ ELIMINA: process.exit(1); 
  }
};

module.exports = { pool, connectDB };