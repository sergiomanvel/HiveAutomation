const express = require('express');
const https = require('https');
const fs = require('fs');
const logger = require('./src/logger'); // Importar Winston
const verifyToken = require('./src/middleware/authMiddleware');
const PORT = process.env.PORT || 3000;

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Rutas de autenticación
const authRoutes = require('./src/routes/auth');
app.use('/api/auth', authRoutes);

// Rutas de usuarios (protegidas con JWT)
const userRoutes = require('./src/routes/users');
app.use('/api/users', verifyToken, userRoutes);

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  logger.error(`Error no controlado: ${err.message}`);
  res.status(500).send('Error en el servidor');
});

// Solo iniciar el servidor si no estamos en pruebas
if (process.env.NODE_ENV !== 'test') {
  const privateKey = fs.readFileSync('C:/Users/Sergio/Documents/key.pem', 'utf8');
  const certificate = fs.readFileSync('C:/Users/Sergio/Documents/cert.pem', 'utf8');
  const credentials = { key: privateKey, cert: certificate };
  
  https.createServer(credentials, app).listen(PORT, () => {
    logger.info(`Servidor HTTPS corriendo en el puerto ${PORT}`);
  });
}

// Exportar la aplicación para las pruebas
module.exports = app;



// const http = require('http');

// // Redirigir de HTTP a HTTPS
// const httpServer = http.createServer((req, res) => {
//   res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
//   res.end();
// });

// // Servidor HTTP en el puerto 80 (puerto estándar para HTTP)
// httpServer.listen(80, () => {
//   console.log('Redirigiendo todo el tráfico HTTP a HTTPS');
// });

