const winston = require('winston');
const path = require('path');

// Configuración de Winston
const logger = winston.createLogger({
  level: 'info', // Nivel de log por defecto
  format: winston.format.combine(
    winston.format.timestamp(), // Agrega una marca de tiempo
    winston.format.json() // Guarda los logs en formato JSON
  ),
  transports: [
    // Guardar los logs de errores en un archivo separado
    new winston.transports.File({ filename: path.join(__dirname, 'logs', 'error.log'), level: 'error' }),
    // Guardar todos los logs en un archivo combinado
    new winston.transports.File({ filename: path.join(__dirname, 'logs', 'combined.log') })
  ],
});

// Si estás en modo desarrollo, también mostrar los logs en la consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

module.exports = logger;
