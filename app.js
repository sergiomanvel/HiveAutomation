const express = require('express');
const https = require('https');
const fs = require('fs');
const logger = require('./src/logger'); // Cambia la ruta para que apunte al archivo correcto
const verifyToken = require('./src/middleware/authMiddleware'); // Actualiza la ruta si es necesario
const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());

const authRoutes = require('./src/routes/auth'); // Manteniendo la ruta
app.use('/api/auth', authRoutes);

const userRoutes = require('./src/routes/users'); // Manteniendo la ruta
app.use('/api/users', verifyToken, userRoutes);

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  logger.error(`Error no controlado: ${err.message}`);
  res.status(500).send('Error en el servidor');
});

if (process.env.NODE_ENV !== 'test') {
  try {
    const privateKey = fs.readFileSync('C:/Users/Sergio/Documents/key.pem', 'utf8'); // Ruta del archivo de clave privada
    const certificate = fs.readFileSync('C:/Users/Sergio/Documents/cert.pem', 'utf8'); // Ruta del archivo de certificado

    // Eliminamos la variable `ca` ya que no estamos usando un archivo `chain.pem`
    const credentials = { key: privateKey, cert: certificate };
    
    https.createServer(credentials, app).listen(PORT, () => {
      logger.info(`Servidor HTTPS corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    logger.error('Error al leer los archivos de certificados: ' + error.message);
  }
}

module.exports = app;

// Código comentado para redirigir de HTTP a HTTPS
// const http = require('http');

// const httpServer = http.createServer((req, res) => {
//   res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
//   res.end();
// });

// httpServer.listen(80, () => {
//   console.log('Redirigiendo todo el tráfico HTTP a HTTPS');
// });
