const request = require('supertest');
const app = require('../../app'); // Asegúrate de que la ruta es correcta a tu archivo app.js
const pool = require('../db'); // Asegúrate de que esta es la ruta correcta hacia tu archivo de conexión a la base de datos

const tokenValido = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXNlcm5hbWUiOiJhZG1pbiIsImlhdCI6MTcyODcyNzM0MiwiZXhwIjoxNzI4NzMwOTQyfQ.2goGY1LDwHJhqsEm_up7PproQ9e-A9ASa7CIAJ7dXvk';


beforeEach(async () => {
  // Limpia la tabla de usuarios antes de cada prueba
  await pool.query('DELETE FROM users');

  // Inserta un usuario de prueba
  await pool.query(
    "INSERT INTO users (id, username, password) VALUES (1, 'admin', 'passwordHash')"
  );
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
    const updatedUser = { username: 'updateduser', password: 'updatedpassword' };
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

// Cerrar la conexión de base de datos después de todas las pruebas
afterAll(async () => {
  await pool.end(); // Esto asegurará que todas las conexiones de base de datos se cierren después de las pruebas
});
