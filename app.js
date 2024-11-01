const express = require("express");
const rateLimit = require("express-rate-limit");
const https = require("https");
const fs = require("fs");
const helmet = require("helmet");
const csrf = require("csurf");
const cookieParser = require("cookie-parser");

const logger = require("./src/logger");
const { client } = require("./src/redisClient"); // Cliente centralizado de Redis
const authRoutes = require("./src/routes/auth");
const userRoutes = require("./src/routes/users");

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

// Seguridad con Helmet para proteger cabeceras HTTP
app.use(helmet());

// Parseo de JSON y manejo de cookies en Express
app.use(express.json());
app.use(cookieParser());

// Configuración del middleware CSRF
const csrfProtection = csrf({
  cookie: { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'None' : 'Strict' }
});

// Ruta para obtener el token CSRF
app.get("/api/csrf-token", csrfProtection, (req, res) => {
  res.status(200).json({ csrfToken: req.csrfToken() });
});

// Middleware de protección CSRF, solo fuera del entorno de prueba
if (process.env.NODE_ENV !== "test") {
  app.use(csrfProtection);
}

// Middleware para agregar el token CSRF en las cookies de respuesta
app.use((req, res, next) => {
  res.cookie("XSRF-TOKEN", req.csrfToken ? req.csrfToken() : '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Strict'
  });
  next();
});

// Configuración de límite de tasa de solicitudes (rate limiting)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 solicitudes por cada IP en la ventana de tiempo
  message: "Demasiadas solicitudes desde esta IP, intenta nuevamente más tarde.",
});
app.use(limiter); // Aplicar a todas las rutas

// Middleware para verificar caché en Redis antes de acceder a la base de datos
const checkCache = async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next();

  try {
    const data = await client.get(id);
    if (data) {
      logger.info(`Cache hit para ID: ${id}`);
      return res.json(JSON.parse(data));
    }
    next();
  } catch (err) {
    logger.error(`Error con Redis: ${err.message}`);
    next();
  }
};

// Configuración de rutas
app.use("/api/auth", authRoutes);
app.use("/api/users", checkCache, userRoutes);

// Rutas de prueba de estado y principal
app.get("/", (req, res) => res.send("Bienvenido a HiveAutomation API"));
app.get("/health", (req, res) => res.status(200).send("API is working"));

// Manejo global de errores en la aplicación
app.use((err, req, res, next) => {
  logger.error(`Error no controlado: ${err.stack}`);
  res.status(500).send("Error en el servidor");
});

// Inicialización condicional del servidor para entornos de desarrollo y producción
let server; // Declarar el servidor para poder exportarlo

if (isProduction) {
  const sslKeyPath = process.env.SSL_KEY_PATH || "C:/Users/Sergio/Documents/key.pem";
  const sslCertPath = process.env.SSL_CERT_PATH || "C:/Users/Sergio/Documents/cert.pem";

  if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    const privateKey = fs.readFileSync(sslKeyPath, "utf8");
    const certificate = fs.readFileSync(sslCertPath, "utf8");
    const credentials = { key: privateKey, cert: certificate };

    server = https.createServer(credentials, app).listen(PORT, () => {
      logger.info(`Servidor HTTPS corriendo en el puerto ${PORT}`);
    });
  } else {
    server = app.listen(PORT, () => {
      logger.warn("Archivos SSL no encontrados, ejecutando HTTP en producción.");
      logger.info(`Servidor HTTP corriendo en el puerto ${PORT} en producción`);
    });
  }
} else if (process.env.NODE_ENV !== "test") {
  // Solo iniciar el servidor HTTP en desarrollo si no está en modo de prueba
  server = app.listen(PORT, () => {
    logger.info(`Servidor HTTP corriendo en el puerto ${PORT} en desarrollo`);
  });
}

// Exportar `app` y `server` para poder cerrarlo en las pruebas
module.exports = { app, server };
