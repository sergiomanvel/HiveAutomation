const express = require("express");
const { body, validationResult } = require("express-validator");
const authController = require("../controllers/authController");

const router = express.Router();

// Ruta de registro con validación y sanitización
router.post(
  "/register",
  [
    body("username")
      .isAlphanumeric()
      .withMessage("El nombre de usuario debe ser alfanumérico")
      .trim()
      .escape(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("La contraseña debe tener al menos 6 caracteres")
      .trim()
      .escape(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    authController.register(req, res);
  }
);

// Ruta de login
router.post(
  "/login",
  (req, res) => {
    authController.login(req, res);
  }
);

module.exports = router;
