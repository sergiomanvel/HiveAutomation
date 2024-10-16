const express = require('express');
const https = require('https');
const fs = require('fs');
const logger = require('./src/logger');
const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

// Rutas
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  logger.error(`Error no controlado: ${err.message}`);
  res.status(500).send('Error en el servidor');
});

// Usar HTTPS solo en desarrollo local
if (process.env.NODE_ENV === 'development') {
  const privateKey = fs.readFileSync('C:/Users/Sergio/Documents/key.pem', 'utf8');
  const certificate = fs.readFileSync('C:/Users/Sergio/Documents/cert.pem', 'utf8');
  const credentials = { key: privateKey, cert: certificate };

  https.createServer(credentials, app).listen(PORT, () => {
    logger.info(`Servidor HTTPS corriendo en el puerto ${PORT}`);
  });
} else {
  // Usar HTTP en producción (Heroku) ya que Heroku maneja HTTPS automáticamente
  app.listen(PORT, () => {
    logger.info(`Servidor HTTP corriendo en el puerto ${PORT}`);
  });
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
