// Conexión a MySQL usando un "pool" de conexiones.
// Un pool mantiene varias conexiones abiertas y las reutiliza,
// así no se abre una conexión nueva en cada petición.
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'reuse_campus',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true // devuelve las fechas como texto 'YYYY-MM-DD HH:MM:SS'
});

// Comprueba al iniciar el servidor que MySQL responde.
async function probarConexion() {
  const conexion = await pool.getConnection();
  await conexion.ping();
  conexion.release();
}

module.exports = { pool, probarConexion };
