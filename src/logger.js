const winston = require('winston');
const path = require('path');

// Formato de log personalizado que incluye nivel, mensaje y timestamp
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Configuración de Winston para el registro de logs
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // Nivel de log configurable (por defecto 'info')
  format: winston.format.combine(
    winston.format.errors({ stack: true }), // Incluir stack trace en errores
    logFormat
  ),
  transports: [
    // Guardar logs de errores en un archivo separado
    new winston.transports.File({ 
      filename: path.join(__dirname, 'logs', 'error.log'), 
      level: 'error' 
    }),
    // Guardar todos los logs en un archivo combinado
    new winston.transports.File({ 
      filename: path.join(__dirname, 'logs', 'combined.log') 
    })
  ],
});

// Mostrar logs en la consola si estamos en desarrollo o si se habilita explícitamente
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_CONSOLE_LOGS === 'true') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(), // Colorea los logs en la consola
      winston.format.simple()
    )
  }));
}

module.exports = logger;
