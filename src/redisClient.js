const { createClient, createCluster } = require("redis");
const logger = require("./logger");

let client;

if (process.env.NODE_ENV === "production" && process.env.REDIS_CLUSTER === "true") {
    client = createCluster({
        slotsRefreshTimeout: 20000,
        nodes: [
            { url: process.env.REDIS_NODE_1 || "redis://localhost:6379" },
            { url: process.env.REDIS_NODE_2 || "redis://localhost:6379" },
            { url: process.env.REDIS_NODE_3 || "redis://localhost:6379" },
        ],
    });
} else {
    client = createClient({
        url: process.env.REDISCLOUD_URL || "redis://localhost:6379",
    });
}

client.on("connect", () => logger.info("Conectado a Redis exitosamente"));
client.on("error", (err) => logger.error(`Error en Redis: ${err.message}`));

// Conectar a Redis de manera asíncrona
const connectRedis = async () => {
    try {
        await client.connect();
        logger.info("Cliente Redis conectado");
    } catch (err) {
        logger.error(`Error al conectar a Redis: ${err.message}`);
    }
};

if (process.env.NODE_ENV !== "test") {
    connectRedis();
}

const closeRedisConnection = async () => {
    if (client) {
        await client.quit();
        logger.info("Conexión a Redis cerrada");
    }
};

module.exports = { client, closeRedisConnection, connectRedis };
