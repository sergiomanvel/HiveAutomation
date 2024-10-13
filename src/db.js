const { Pool } = require('pg');

// Configura la conexión a PostgreSQL
const pool = new Pool({
  user: 'didpool', // Usuario de PostgreSQL
  host: 'localhost',
  database: 'HiveAutomationDB', // Nombre de tu base de datos
  password: 'TriForce1998-**', // Contraseña configurada en PostgreSQL
  port: 5432, // Puerto por defecto
});

module.exports = pool;
