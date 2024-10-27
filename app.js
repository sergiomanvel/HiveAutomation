const express = require('express');
const rateLimit = require('express-rate-limit');
const https = require('https');
const fs = require('fs');
const logger = require('./src/logger');
const { createClient } = require('redis');  // Usamos createClient para Redis v4
const helmet = require('helmet');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Redis (se ajusta según si está en local o en Heroku)
const redisUrl = process.env.REDISCLOUD_URL || 'redis://localhost:6379';  // Usar REDISCLOUD_URL en Heroku
const client = createClient({ url: redisUrl });

// Conectar explícitamente a Redis y manejar errores
client.connect().catch(err => {
  logger.error('Error conectando a Redis:', err);
});

client.on('connect', () => {
  logger.info('Conectado a Redis correctamente');
});

client.on('error', (err) => {
  logger.error('Error conectando a Redis:', err);
});

// Configurar Express para confiar en el proxy de Heroku
app.set('trust proxy', 1);  // Confía en el proxy para la IP real del cliente

// Middleware para manejar timeout en Express
app.use((req, res, next) => {
  res.setTimeout(60000, () => { // Ajusta el timeout a 60 segundos para diagnóstico
    logger.error('La solicitud ha tomado demasiado tiempo.');
    res.status(503).send('La solicitud ha expirado.');
  });
  next();
});

// Middleware para verificar caché
const checkCache = async (req, res, next) => {
  const { id } = req.params;

  // Verificar si el ID está presente en los parámetros de la ruta
  if (!id) {
    logger.info("No se proporcionó un ID, saltando verificación de caché");
    return next();
  }

  const redisKey = String(id);
  const start = Date.now();  // Marca de tiempo antes de la operación Redis

  logger.info(`Verificando caché para el ID: ${redisKey}`);

  try {
    const data = await client.get(redisKey);
    const duration = Date.now() - start;  // Tiempo transcurrido
    logger.info(`Operación Redis completada en ${duration} ms`);

    if (data !== null) {
      logger.info(`Datos obtenidos del caché para el usuario con ID ${redisKey}`);
      return res.json(JSON.parse(data));
    } else {
      logger.info(`No se encontraron datos en caché para el usuario con ID ${redisKey}`);
      next();
    }
  } catch (err) {
    logger.error(`Error con Redis: ${err.message}`);
    next();
  }
};

// Seguridad con Helmet
app.use(helmet());

// Usar JSON en las solicitudes
app.use(express.json());

// Configurar cookieParser para CSRF
app.use(cookieParser());

// Configuración de CSRF
const csrfProtection = csrf({ cookie: { httpOnly: true, secure: true, sameSite: 'None' } });
app.use(csrfProtection);

// Middleware para agregar el token CSRF en la cookie
app.use((req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken());
  next();
});

// Configuración de express-rate-limit
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutos
//   max: 100, // Limita a 100 solicitudes por cada 15 minutos
//   message: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo más tarde.'
// });

// Aplicar el limitador de tasa a todas las rutas
//app.use(limiter);

// Rutas
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');

// Aplicar el middleware de caché solo a la ruta de usuarios con ID
app.use('/api/users', checkCache, userRoutes); // checkCache solo cuando hay un ID
app.use('/api/auth', authRoutes); // Rutas de autenticación

// Ruta para la página principal
app.get('/', (req, res) => {
  res.send('Bienvenido a HiveAutomation API');
});

app.get('/health', (req, res) => {
  res.status(200).send('API is working');
});

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  logger.error(`Error no controlado: ${err.stack}`);
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
