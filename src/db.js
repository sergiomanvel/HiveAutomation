require('dotenv').config(); // Cargar las variables de entorno desde el archivo .env
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Ajusta el número máximo de conexiones
  idleTimeoutMillis: 30000, // Tiempo antes de que las conexiones inactivas se cierren
  connectionTimeoutMillis: 2000, // Tiempo de espera para obtener una nueva conexión
});



// Manejo de errores en la conexión a la base de datos
pool.on('error', (err, client) => {
  console.error('Error inesperado en la conexión a la base de datos', err);
  process.exit(-1);
});

module.exports = pool;
