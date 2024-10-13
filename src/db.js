require('dotenv').config(); // Cargar las variables de entorno desde el archivo .env
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});


// Manejo de errores en la conexión a la base de datos
pool.on('error', (err, client) => {
  console.error('Error inesperado en la conexión a la base de datos', err);
  process.exit(-1);
});

module.exports = pool;
