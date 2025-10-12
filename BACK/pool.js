// BACK/pool.js
const { Pool } = require('pg');
// ⚠️ NO ES NECESARIO require('dotenv') NI dotenv.config() aquí, 
// Vercel inyecta las variables automáticamente.

// ----------------------------------------------------------------------
// CONFIGURACIÓN DEL POOL DE CONEXIONES
// Se usa process.env.DATABASE_URL (la URL completa) para la conexión.
// ----------------------------------------------------------------------
const pool = new Pool({
  // Vercel leerá la variable de entorno DATABASE_URL (ej: postgresql://user:pass@host:port/db)
  connectionString: process.env.DATABASE_URL, 
  
  // Configuración necesaria para conectar a bases de datos en la nube (como Supabase)
  ssl: {
    rejectUnauthorized: false
  }
});

// ----------------------------------------------------------------------
// FUNCIÓN PARA PROBAR LA CONEXIÓN Y DEPURAR
// ----------------------------------------------------------------------
const connectDB = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: La variable DATABASE_URL no está configurada en Vercel.');
    // No salimos con process.exit() para que Vercel pueda terminar la solicitud
    return;
  }
  
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL Connected successfully!');
    client.release(); // Liberar conexión al pool
  } catch (err) {
    // Esto capturará el error ENOTFOUND o un error de credenciales/conexión
    console.error('❌ PostgreSQL Connection Error:', err.message, err.code, err.hostname);
    // Es recomendable NO usar process.exit(1) en el código de Vercel,
    // ya que detiene el worker y Vercel te da un error menos claro.
  }
};

module.exports = { pool, connectDB };