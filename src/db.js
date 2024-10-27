require('dotenv').config(); // Cargar las variables de entorno desde el archivo .env
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: isProduction ? process.env.DATABASE_URL : `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`,
  ssl: isProduction ? { rejectUnauthorized: false } : false, // SSL en Heroku (producción)
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
