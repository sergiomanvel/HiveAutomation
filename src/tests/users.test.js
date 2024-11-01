require("dotenv").config(); // Cargar las variables de entorno para Jest
const request = require("supertest");
const { app, server } = require("../../app"); // Importar tanto `app` como `server`
const { query, closeDbConnection } = require('../../src/db'); // Importar `query` y `closeDbConnection`
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // Importar bcrypt para encriptar la contraseña
const { closeRedisConnection } = require('../../src/redisClient'); // Importar función para cerrar Redis

// Generar un token JWT válido antes de las pruebas
let tokenValido;

beforeEach(async () => {
  // Limpiar la tabla de usuarios antes de cada prueba
  await query("DELETE FROM users");

  // Reiniciar la secuencia de la columna id
  await query("ALTER SEQUENCE users_id_seq RESTART WITH 1");

  // Verificar el valor actual de la secuencia
  const sequenceValue = await query("SELECT nextval('users_id_seq')");
  console.log("Valor de la secuencia después de reiniciar:", sequenceValue.rows[0].nextval);

  // Verificar si el usuario admin ya existe
  const adminExists = await query("SELECT * FROM users WHERE username = 'admin'");
  if (adminExists.rows.length > 0) {
    console.log("El usuario admin ya existe");
  }

  // Encriptar la contraseña del usuario 'admin' antes de insertarla
  const hashedPassword = await bcrypt.hash("password", 10);

  // Insertar el usuario 'admin' con la contraseña encriptada
  await query(
    "INSERT INTO users (id, username, password) VALUES (1, 'admin', $1)",
    [hashedPassword]
  );

  // Generar un token JWT válido para el usuario 'admin'
  tokenValido = jwt.sign({ id: 1, username: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
});

describe("API de Usuarios", () => {
  it("Debería obtener todos los usuarios", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${tokenValido}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  it("Debería obtener un usuario por ID", async () => {
    const res = await request(app)
      .get("/api/users/1")
      .set("Authorization", `Bearer ${tokenValido}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("id");
  });

  it("Debería crear un nuevo usuario", async () => {
    const newUser = { username: "testuser", password: "testpassword" };
    const res = await request(app)
      .post("/api/users")
      .send(newUser)
      .set("Authorization", `Bearer ${tokenValido}`);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("username", "testuser");
  });

  it("Debería actualizar un usuario", async () => {
    const updatedUser = { username: "updateduser", password: "newpassword" };
    const res = await request(app)
      .put("/api/users/1")
      .send(updatedUser)
      .set("Authorization", `Bearer ${tokenValido}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("username", "updateduser");
  });

  it("Debería eliminar un usuario", async () => {
    const res = await request(app)
      .delete("/api/users/1")
      .set("Authorization", `Bearer ${tokenValido}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Usuario eliminado");
  });
});

afterAll(async () => {
  // Cerrar la conexión a la base de datos después de todas las pruebas
  await closeDbConnection();

  // Cerrar la conexión de Redis y el servidor
  await closeRedisConnection();
  server.close();
});
