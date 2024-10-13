const express = require("express");
const router = express.Router();
const pool = require("../db");
const logger = require('../logger'); // Importar Winston

// Obtener todos los usuarios (sin devolver la contraseña)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username FROM users"); // No seleccionamos el campo password
    res.json(result.rows);
  } catch (err) {
    logger.error(`Error al obtener usuarios: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

// RUTA PARA PROBAR WINSTON
// router.get("/", async (req, res) => {
//   try {
//     throw new Error("Error simulado para probar logs");
//   } catch (err) {
//     logger.error(`Error al obtener usuarios: ${err.message}`);
//     res.status(500).send("Error en el servidor");
//   }
// });
 
// Obtener un usuario por ID (sin devolver la contraseña)
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, username FROM users WHERE id = $1",
      [id]
    ); // No seleccionamos el campo password
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(`Error al obtener usuario por ID: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

// Crear un nuevo usuario (sin devolver la contraseña en la respuesta)
router.post("/", async (req, res) => {
  const { username, password } = req.body;
  try {
    // Insertar usuario y devolver solo el id y el username
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username", // Solo devolvemos id y username
      [username, password]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error(`Error al crear usuario: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

// Actualizar un usuario (sin devolver la contraseña en la respuesta)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      "UPDATE users SET username = $1, password = $2 WHERE id = $3 RETURNING id, username", // Solo devolvemos id y username
      [username, password, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(`Error al actualizar usuario: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

// Eliminar un usuario
router.delete("/:id", async (req, res) => {
  const { id } = req.params; // Asegúrate de extraer correctamente el parámetro ID
  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    logger.error(`Error al eliminar usuario: ${err.message}`);
    res.status(500).send("Error en el servidor");
  }
});

module.exports = router;
