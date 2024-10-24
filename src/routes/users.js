const express = require("express");
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const pool = require("../db");
const logger = require('../logger'); 
const { createClient } = require('redis');

// Configuración de Redis (Redis v4)
const client = createClient({
  url: 'redis://localhost:6379'
});

client.on('error', (err) => {
  logger.error(`Error conectando a Redis: ${err.message}`);
});

(async () => {
  await client.connect(); // Asegura la conexión en Redis v4
})();

// Middleware para verificar caché
const checkCache = async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    logger.info("No se proporcionó un ID, saltando verificación de caché");
    return next();
  }

  const redisKey = String(id);
  const start = Date.now();  // Marca de tiempo antes de la operación Redis

  logger.info(`Verificando caché para el ID: ${redisKey}`);

  try {
    const data = await client.get(redisKey);
    const duration = Date.now() - start;  // Tiempo transcurrido
    logger.info(`Operación Redis completada en ${duration} ms`);

    if (data !== null) {
      logger.info(`Datos obtenidos del caché para el usuario con ID ${redisKey}`);
      return res.json(JSON.parse(data));
    } else {
      logger.info(`No se encontraron datos en caché para el usuario con ID ${redisKey}`);
      next();
    }
  } catch (err) {
    logger.error(`Error con Redis: ${err.message}`);
    next();
  }
};

// Obtener todos los usuarios (sin devolver la contraseña)
router.get("/", async (req, res) => {
  logger.info('Recibida solicitud GET para todos los usuarios');
  try {
    const start = Date.now();  // Marca de tiempo antes de la consulta
    const result = await pool.query("SELECT id, username FROM users");
    const duration = Date.now() - start;  // Tiempo transcurrido
    logger.info(`Consulta de todos los usuarios completada en ${duration} ms`);
    
    res.json(result.rows);
  } catch (err) {
    logger.error(`Error al obtener usuarios: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

// Obtener un usuario por ID
router.get("/:id", checkCache, async (req, res) => {
  const { id } = req.params;
  logger.info(`Recibida solicitud GET para el usuario con ID: ${id}`);
  
  try {
    const start = Date.now();  // Marca de tiempo antes de la consulta
    const result = await pool.query(
      "SELECT id, username FROM users WHERE id = $1",
      [id]
    );
    const duration = Date.now() - start;  // Tiempo transcurrido
    logger.info(`Consulta para usuario con ID ${id} completada en ${duration} ms`);
    
    if (result.rows.length === 0) {
      logger.info(`Usuario con ID ${id} no encontrado`);
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    // Guardar en caché los resultados por 1 hora (3600 segundos) en Redis v4
    await client.set(id, JSON.stringify(user), {
      EX: 3600  // Tiempo de expiración en segundos
    });

    logger.info(`Usuario con ID ${id} encontrado, devolviendo datos`);
    res.json(user);
  } catch (err) {
    logger.error(`Error al obtener usuario por ID: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

// Crear un nuevo usuario (sin devolver la contraseña en la respuesta)
router.post("/", async (req, res) => {
  const { username, password } = req.body;
  try {
    const start = Date.now();  // Marca de tiempo antes del proceso de creación
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insertar usuario y devolver solo el id y el username
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username", 
      [username, hashedPassword]
    );
    const duration = Date.now() - start;  // Tiempo transcurrido
    logger.info(`Creación de usuario completada en ${duration} ms`);

    // Eliminar cualquier caché previo de usuarios
    await client.flushDb();

    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error(`Error al crear usuario: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

// Actualizar un usuario (con encriptación de la contraseña)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizar el usuario en la base de datos
    const result = await pool.query(
      "UPDATE users SET username = $1, password = $2 WHERE id = $3 RETURNING id, username", 
      [username, hashedPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Actualización exitosa, eliminar la entrada en caché de Redis
    await client.del(id);

    res.json(result.rows[0]);
  } catch (err) {
    logger.error(`Error al actualizar usuario: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

// Eliminar un usuario
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Eliminación exitosa, borrar del caché de Redis
    await client.del(id);

    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    logger.error(`Error al eliminar usuario: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

module.exports = router;