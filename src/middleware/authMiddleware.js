const jwt = require('jsonwebtoken');
const secretKey = 'tu_clave_secreta';

// Middleware para proteger las rutas
const verifyToken = (req, res, next) => {
  // Obtener el encabezado Authorization
  const authHeader = req.header('Authorization');

  // Verificar si el encabezado está presente
  if (!authHeader) {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  // Extraer el token eliminando el prefijo 'Bearer '
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'Acceso denegado, token no proporcionado' });
  }

  try {
    // Verificar el token con la clave secreta
    const verified = jwt.verify(token, secretKey);
    req.user = verified; // Añadir el usuario verificado al request
    next(); // Pasar al siguiente middleware o ruta
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
};

module.exports = verifyToken;
