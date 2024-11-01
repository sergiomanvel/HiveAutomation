require("dotenv").config({ path: ".env.test" }); // Asegura que uses las variables de entorno para pruebas
const request = require("supertest");
const app = require("../app"); // Ruta del archivo app.js
const pool = require("../db"); // Conexión a PostgreSQL
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const client = require('../src/redisClient'); // Cliente Redis

let tokenValido;

beforeAll(async () => {
    // Limpiar base de datos y cache antes de iniciar las pruebas
    await pool.query("DELETE FROM users");
    await client.flushDb();

    // Crear un usuario de prueba 'admin' y generar un token JWT válido
    const hashedPassword = await bcrypt.hash("password", 10);
    await pool.query("INSERT INTO users (username, password) VALUES ('admin', $1)", [hashedPassword]);
    tokenValido = jwt.sign({ username: "admin" }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
    await pool.end();  // Cierra la conexión a la base de datos
    await client.disconnect();  // Cierra la conexión de Redis
});

describe("Pruebas de integración para API de Usuarios", () => {
    test("Debería autenticar y obtener la lista de usuarios desde la base de datos", async () => {
        const res = await request(app)
            .get("/api/users")
            .set("Authorization", `Bearer ${tokenValido}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toBeInstanceOf(Array);
    });

    test("Debería crear un usuario nuevo y almacenarlo en la cache", async () => {
        const newUser = { username: "testuser", password: "testpassword" };
        const res = await request(app)
            .post("/api/users")
            .send(newUser)
            .set("Authorization", `Bearer ${tokenValido}`);
        
        expect(res.statusCode).toEqual(201);
        expect(res.body.username).toBe("testuser");

        // Verificar que el usuario está en la cache de Redis
        const cachedUser = await client.get(res.body.id);
        expect(cachedUser).not.toBeNull();
    });

    test("Debería actualizar el usuario y verificar el cambio en la base de datos", async () => {
        const updatedUser = { username: "updateduser", password: "newpassword" };
        const res = await request(app)
            .put("/api/users/1")
            .send(updatedUser)
            .set("Authorization", `Bearer ${tokenValido}`);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.username).toBe("updateduser");

        // Verificar que los datos de usuario actualizados están en Redis
        const cachedUpdatedUser = await client.get("1");
        expect(cachedUpdatedUser).not.toBeNull();
        expect(JSON.parse(cachedUpdatedUser).username).toBe("updateduser");
    });

    test("Debería eliminar el usuario de la base de datos y de la cache", async () => {
        const res = await request(app)
            .delete("/api/users/1")
            .set("Authorization", `Bearer ${tokenValido}`);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toBe("Usuario eliminado");

        // Verificar que el usuario fue eliminado de Redis
        const cachedUserAfterDeletion = await client.get("1");
        expect(cachedUserAfterDeletion).toBeNull();
    });
});
