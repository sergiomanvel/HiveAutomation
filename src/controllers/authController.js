const jwt = require('jsonwebtoken'); // Librería para manejar JWT (tokens de autenticación)
const bcrypt = require('bcryptjs'); // Librería para encriptar contraseñas
const pool = require('../db'); // Pool de conexiones a PostgreSQL

// Clave secreta para JWT desde las variables de entorno
const secretKey = process.env.JWT_SECRET || 'tu_clave_secreta';

// Registro de usuario
exports.register = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Encriptar la contraseña antes de guardarla en la base de datos
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar nuevo usuario en la base de datos
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );

    // Respuesta con los datos del usuario registrado
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor');
  }
};

// Inicio de sesión
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Verificar si el usuario existe en la base de datos
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    // Verificar que la contraseña sea correcta
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Generar un token JWT para el usuario autenticado
    const token = jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: '1h' });

    // Respuesta con el token de autenticación
    res.json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor');
  }
};
