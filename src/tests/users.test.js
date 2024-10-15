require('dotenv').config(); // Cargar las variables de entorno para Jest
const request = require('supertest');
const app = require('../../app');
const pool = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Importamos bcrypt para encriptar la contraseña

// Generamos un token JWT válido antes de las pruebas
let tokenValido;

beforeEach(async () => {
  // Limpiar la tabla de usuarios antes de cada prueba
  await pool.query('DELETE FROM users');
  
  // Encriptar la contraseña del usuario 'admin' antes de insertarla
  const hashedPassword = await bcrypt.hash('password', 10);

  // Insertar el usuario 'admin' con la contraseña encriptada
  await pool.query(
    "INSERT INTO users (id, username, password) VALUES (1, 'admin', $1)", [hashedPassword]
  );

  // Generar un token JWT válido para el usuario 'admin'
  tokenValido = jwt.sign({ id: 1, username: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

describe('API de Usuarios', () => {
  it('Debería obtener todos los usuarios', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tokenValido}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  it('Debería obtener un usuario por ID', async () => {
    const res = await request(app)
      .get('/api/users/1')
      .set('Authorization', `Bearer ${tokenValido}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id');
  });

  it('Debería crear un nuevo usuario', async () => {
    const newUser = { username: 'testuser', password: 'testpassword' };
    const res = await request(app)
      .post('/api/users')
      .send(newUser)
      .set('Authorization', `Bearer ${tokenValido}`);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('username', 'testuser');
  });

  it('Debería actualizar un usuario', async () => {
    const updatedUser = { username: 'updateduser', password: 'newpassword' };
    const res = await request(app)
      .put('/api/users/1')
      .send(updatedUser)
      .set('Authorization', `Bearer ${tokenValido}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('username', 'updateduser');
  });

  it('Debería eliminar un usuario', async () => {
    const res = await request(app)
      .delete('/api/users/1')
      .set('Authorization', `Bearer ${tokenValido}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Usuario eliminado');
  });
});

afterAll(async () => {
  await pool.end(); // Cerrar la conexión a la base de datos después de todas las pruebas
});
