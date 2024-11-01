const { createClient, createCluster } = require("redis");
const logger = require("./logger");

// Definir el tipo de cliente Redis según el entorno
let client;

// Configuración condicional del cliente Redis
if (process.env.NODE_ENV === "production" && process.env.REDIS_CLUSTER === "true") {
  // Crear el cliente de Redis Cluster para producción
  client = createCluster({
    slotsRefreshTimeout: 20000, // Ajuste de tiempo para evitar pérdida de datos en alta concurrencia
    nodes: [
      { url: process.env.REDIS_NODE_1 || "redis://cluster-node-1:6379" },
      { url: process.env.REDIS_NODE_2 || "redis://cluster-node-2:6379" },
      { url: process.env.REDIS_NODE_3 || "redis://cluster-node-3:6379" },
    ],
  });
} else if (process.env.NODE_ENV === "test") {
  // Cliente simulado para el entorno de pruebas
  client = {
    data: new Map(),
    async get(key) {
      return this.data.get(key) || null;
    },
    async set(key, value) {
      this.data.set(key, value);
    },
    async quit() {
      this.data.clear();
      logger.info("Simulated Redis connection closed (test environment)");
    }
  };
} else {
  // Cliente Redis estándar para desarrollo
  client = createClient({
    url: process.env.REDISCLOUD_URL || "redis://localhost:6379",
  });
}

// Eventos para conexión y errores en Redis estándar y cluster
if (client instanceof createClient || client instanceof createCluster) {
  client.on("connect", () => logger.info("Conectado a Redis exitosamente"));
  client.on("error", (err) => logger.error(`Error en Redis: ${err.message}`));
}

// Función para conectar a Redis, solo para entornos fuera de pruebas
const connectRedis = async () => {
  if (client.connect) { // Verifica que el método connect exista
    try {
      await client.connect();
      logger.info("Cliente Redis conectado");
    } catch (err) {
      logger.error(`Error al conectar a Redis: ${err.message}`);
    }
  }
};

// Conectar automáticamente a Redis solo fuera del entorno de pruebas
if (process.env.NODE_ENV !== "test") {
  connectRedis();
}

// Función para cerrar Redis, compatible con entornos simulados de prueba
const closeRedisConnection = async () => {
  if (client.quit) {
    await client.quit();
    logger.info("Conexión a Redis cerrada");
  }
};

module.exports = { client, closeRedisConnection, connectRedis };
