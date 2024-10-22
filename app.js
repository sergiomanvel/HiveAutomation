const express = require('express');
const rateLimit = require('express-rate-limit');
const https = require('https');
const fs = require('fs');
const logger = require('./src/logger');
const app = express();
const PORT = process.env.PORT || 3000;
const helmet = require('helmet');

app.use(express.json());

// Usar Helmet para seguridad básica de cabeceras HTTP
app.use(helmet());

// Configuración de express-rate-limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limita a 100 solicitudes por cada 15 minutos
  message: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo más tarde.'
});

// Aplicar el limitador de tasa a todas las rutas
app.use(limiter);

// Rutas
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Ruta para la página principal
app.get('/', (req, res) => {
  res.send('Bienvenido a HiveAutomation API');
});

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  logger.error(`Error no controlado: ${err.message}`);
  res.status(500).send('Error en el servidor');
});

// Verificar si los archivos SSL están disponibles
const sslKeyPath = 'C:/Users/Sergio/Documents/key.pem';
const sslCertPath = 'C:/Users/Sergio/Documents/cert.pem';

if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
  // Si los archivos SSL están disponibles, inicia el servidor HTTPS
  const privateKey = fs.readFileSync(sslKeyPath, 'utf8');
  const certificate = fs.readFileSync(sslCertPath, 'utf8');
  const credentials = { key: privateKey, cert: certificate };

  https.createServer(credentials, app).listen(PORT, () => {
    logger.info(`Servidor HTTPS corriendo en el puerto ${PORT}`);
  });
} else if (process.env.NODE_ENV === 'production') {
  // Usar HTTP en producción (Heroku) ya que Heroku maneja HTTPS automáticamente
  app.listen(PORT, () => {
    logger.info(`Servidor HTTP corriendo en el puerto ${PORT} en producción`);
  });
} else {
  // Para otros entornos, como desarrollo sin certificados, usa HTTP
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
