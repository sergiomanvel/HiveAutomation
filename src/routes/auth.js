const express = require("express");
const { body, validationResult } = require("express-validator");
const authController = require("../controllers/authController");

const router = express.Router();

// Ruta de registro con validación y sanitización
router.post(
  "/register",
  [
    // Validar que el nombre de usuario sea alfanumérico
    body("username")
      .isAlphanumeric()
      .withMessage("El nombre de usuario debe ser alfanumérico")
      .trim()
      .escape(),

    // Validar que la contraseña tenga al menos 6 caracteres
    body("password")
      .isLength({ min: 6 })
      .withMessage("La contraseña debe tener al menos 6 caracteres")
      .trim()
      .escape(),
  ],
  (req, res) => {
    // Manejar los errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Procesar el registro de usuario
    authController.register(req, res);
  }
);

module.exports = router;
