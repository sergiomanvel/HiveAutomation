require('dotenv').config(); // Cargar las variables de entorno desde el archivo .env
const { Pool } = require('pg'); // Importar Pool para manejar conexiones a PostgreSQL

// Detectar si estamos en producción
const isProduction = process.env.NODE_ENV === 'production';

// Crear la cadena de conexión, usando DATABASE_URL si está definida (Heroku) o las variables individuales
const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;

const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false, // SSL solo para producción
  max: 10, // Número máximo de conexiones simultáneas en el pool
  idleTimeoutMillis: 30000, // Tiempo antes de cerrar conexiones inactivas (30s)
  connectionTimeoutMillis: 2000, // Tiempo máximo para conectar antes de un error (2s)
});

// Manejo de errores en el pool de conexiones
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de conexiones:', err);
  process.exit(-1);
});

// Función para obtener una conexión segura y manejar errores
const query = async (text, params) => {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Consulta ejecutada:', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('Error en consulta:', { text, err });
    throw err;
  }
};

// Función para cerrar la conexión del pool al finalizar todas las pruebas
const closeDbConnection = async () => {
  await pool.end();
  console.log('Conexión a PostgreSQL cerrada');
};

module.exports = {
  query,
  pool, // Exportar pool para operaciones que requieran conexiones directas
  closeDbConnection, // Exportar función para cerrar la conexión al final de las pruebas
};
