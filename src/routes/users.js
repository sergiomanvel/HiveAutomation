const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../db");
const logger = require("../logger");
const client = require("../redisClient"); // Cliente centralizado de Redis

// Middleware para verificar el caché antes de acceder a la base de datos
const checkCache = async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(); // Saltar caché si no hay ID

  try {
    const data = await client.get(id);
    if (data) {
      logger.info(`Cache hit para usuario ID: ${id}`);
      return res.json(JSON.parse(data));
    }
    next(); // Continuar a la base de datos si no hay cache
  } catch (err) {
    logger.error(`Error con Redis: ${err.message}`);
    next();
  }
};

// Ruta para obtener todos los usuarios (sin incluir contraseñas)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username FROM users");
    res.json(result.rows);
  } catch (err) {
    logger.error(`Error al obtener usuarios: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

// Ruta para obtener un usuario por ID, usando caché
router.get("/:id", checkCache, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, username FROM users WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    const user = result.rows[0];
    await client.set(id, JSON.stringify(user), { EX: 3600 }); // Cachear por 1 hora
    res.json(user);
  } catch (err) {
    logger.error(`Error al obtener usuario por ID: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

// Ruta para crear un nuevo usuario
router.post("/", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );
    await client.flushDb(); // Limpiar cache para mantener consistencia
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error(`Error al crear usuario: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

// Ruta para actualizar un usuario
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "UPDATE users SET username = $1, password = $2 WHERE id = $3 RETURNING id, username",
      [username, hashedPassword, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Usuario no encontrado" });

    await client.del(id); // Eliminar cache para evitar datos desactualizados
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(`Error al actualizar usuario: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

// Ruta para eliminar un usuario
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Usuario no encontrado" });

    await client.del(id); // Eliminar cache asociado al usuario
    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    logger.error(`Error al eliminar usuario: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

module.exports = router;
