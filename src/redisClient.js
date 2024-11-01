const { createClient, createCluster } = require('redis');
const logger = require('./logger');

// Definir el tipo de cliente Redis a crear
let client;
if (process.env.NODE_ENV === 'production' && process.env.REDIS_CLUSTER === 'true') {
  // Crear el cliente de Redis Cluster
  client = createCluster({
    slotsRefreshTimeout: 20000, // Ajuste de tiempo para evitar pérdida de datos en alta concurrencia
    nodes: [
      { url: process.env.REDIS_NODE_1 || 'redis://cluster-node-1:6379' },
      { url: process.env.REDIS_NODE_2 || 'redis://cluster-node-2:6379' },
      { url: process.env.REDIS_NODE_3 || 'redis://cluster-node-3:6379' }
    ]
  });
} else {
  // Crear un cliente Redis estándar para entornos de desarrollo o sin cluster
  client = createClient({
    url: process.env.REDISCLOUD_URL || 'redis://localhost:6379'
  });
}

// Eventos para conexión y errores
client.on('connect', () => logger.info('Conectado a Redis exitosamente'));
client.on('error', (err) => logger.error(`Error en Redis: ${err.message}`));

// Conectar el cliente Redis de forma asíncrona
(async () => {
  try {
    await client.connect();
    logger.info('Cliente Redis conectado');
  } catch (err) {
    logger.error(`Error al conectar a Redis: ${err.message}`);
  }
})();

module.exports = client;
