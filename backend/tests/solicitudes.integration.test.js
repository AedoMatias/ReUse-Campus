const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const test = require('node:test');
const express = require('express');
require('dotenv').config({ quiet: true });

const { pool } = require('../config/db');
const { manejarErrores } = require('../middlewares/manejoErrores');

test('Tarea 8: solicitudes mediante HTTP y MySQL', { timeout: 30000 }, async (t) => {
  const marca = `tarea8-${randomUUID()}`;
  const password = randomUUID();
  const correos = [0, 1, 2].map(n => `${marca}-${n}@example.test`);
  const publicaciones = [];
  const app = express();
  app.use(express.json());
  app.use('/auth', require('../routes/auth.routes'));
  app.use('/publicaciones', require('../routes/publicaciones.routes'));
  app.use('/solicitudes', require('../routes/solicitudes.routes'));
  app.use(manejarErrores);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  async function peticion(ruta, esperado, { method = 'GET', token, body } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';
    const respuesta = await fetch(`http://127.0.0.1:${server.address().port}${ruta}`, {
      method, headers, body: JSON.stringify(body),
    });
    const datos = await respuesta.json();
    assert.equal(respuesta.status, esperado, `${method} ${ruta}`);
    return datos;
  }

  try {
    const usuarios = [];
    for (const correo of correos) {
      const credenciales = { correo, password };
      await peticion('/auth/registro', 201, {
        method: 'POST', body: { nombre: marca, ...credenciales },
      });
      usuarios.push(await peticion('/auth/login', 200, { method: 'POST', body: credenciales }));
    }
    const [dueno, primero, segundo] = usuarios;

    async function publicar() {
      const { id } = await peticion('/publicaciones', 201, {
        method: 'POST', token: dueno.token,
        body: { titulo: marca, descripcion: 'Artículo de prueba de integración', categoria: 'LIBROS', modalidad: 'DONACION' },
      });
      publicaciones.push(id);
      return id;
    }

    function solicitar(publicacionId, usuario) {
      return peticion('/solicitudes', 201, {
        method: 'POST', token: usuario.token, body: { publicacionId, mensaje: 'Mensaje de prueba' },
      });
    }

    function cambiar(solicitud, accion, esperado, usuario) {
      return peticion(`/solicitudes/${solicitud.id}/${accion}`, esperado, {
        method: 'PATCH', token: usuario?.token,
      });
    }

    async function verificar(publicacionId, estado, solicitudes, entregas) {
      const publicacion = await peticion(`/publicaciones/${publicacionId}`, 200);
      assert.equal(publicacion.estado, estado);
      const filas = await peticion(`/solicitudes?publicacionId=${publicacionId}`, 200, { token: dueno.token });
      assert.deepEqual(Object.fromEntries(filas.map(s => [s.id, s.estado])), solicitudes);
      const [registros] = await pool.query(
        'SELECT publicacionId, solicitudId, propietarioId, receptorId, estado FROM entrega WHERE publicacionId = ?',
        [publicacionId]
      );
      assert.deepEqual(registros, entregas);
    }

    await t.test('acepta, reserva, rechaza las otras pendientes y genera una entrega', async () => {
      const id = await publicar();
      const a = await solicitar(id, primero);
      const b = await solicitar(id, segundo);
      await cambiar(a, 'aceptar', 401);
      await cambiar(a, 'aceptar', 401, { token: 'invalido' });
      await cambiar(a, 'aceptar', 403, segundo);
      await cambiar(a, 'rechazar', 403, primero);
      await cambiar({ id: 4294967296 }, 'aceptar', 404, dueno);
      assert.equal((await cambiar(a, 'aceptar', 200, dueno)).estado, 'ACEPTADA');
      await cambiar(a, 'aceptar', 409, dueno);
      await cambiar(b, 'aceptar', 409, dueno);
      await verificar(id, 'RESERVADA', { [a.id]: 'ACEPTADA', [b.id]: 'RECHAZADA' }, [{
        publicacionId: id, solicitudId: a.id, propietarioId: dueno.usuario.id,
        receptorId: primero.usuario.id, estado: 'PENDIENTE',
      }]);
      // Simula una pendiente previa en una publicación que ya estaba reservada.
      await pool.query("UPDATE solicitud SET estado = 'PENDIENTE' WHERE id = ? AND publicacionId = ?", [b.id, id]);
      await cambiar(b, 'aceptar', 409, dueno);
      await cambiar(b, 'rechazar', 409, dueno);
    });

    await t.test('rechaza solo la solicitud elegida y conserva la cancelación', async () => {
      const id = await publicar();
      const a = await solicitar(id, primero);
      const b = await solicitar(id, segundo);
      assert.equal((await cambiar(a, 'rechazar', 200, dueno)).estado, 'RECHAZADA');
      await verificar(id, 'DISPONIBLE', { [a.id]: 'RECHAZADA', [b.id]: 'PENDIENTE' }, []);
      assert.equal((await cambiar(b, 'cancelar', 200, segundo)).estado, 'CANCELADA');
    });

    await t.test('solo una aceptación concurrente puede ganar', async () => {
      const id = await publicar();
      const a = await solicitar(id, primero);
      const b = await solicitar(id, segundo);
      const estados = await Promise.all([a, b].map(async s => {
        const resultado = await fetch(`http://127.0.0.1:${server.address().port}/solicitudes/${s.id}/aceptar`, {
          method: 'PATCH', headers: { Authorization: `Bearer ${dueno.token}` },
        });
        await resultado.json();
        return resultado.status;
      }));
      assert.deepEqual([...estados].sort(), [200, 409]);
      const [ganadora, rechazada] = estados[0] === 200 ? [a, b] : [b, a];
      await verificar(id, 'RESERVADA', { [ganadora.id]: 'ACEPTADA', [rechazada.id]: 'RECHAZADA' }, [{
        publicacionId: id, solicitudId: ganadora.id, propietarioId: dueno.usuario.id,
        receptorId: ganadora.solicitanteId, estado: 'PENDIENTE',
      }]);
    });

    await t.test('revierte la aceptación si falla la creación de la entrega', async () => {
      const id = await publicar();
      const a = await solicitar(id, primero);
      const b = await solicitar(id, segundo);
      const entrega = {
        publicacionId: id, solicitudId: a.id, propietarioId: dueno.usuario.id,
        receptorId: primero.usuario.id, estado: 'PENDIENTE',
      };
      await pool.query('INSERT INTO entrega SET ?', entrega);
      await cambiar(a, 'aceptar', 409, dueno);
      await verificar(id, 'DISPONIBLE', { [a.id]: 'PENDIENTE', [b.id]: 'PENDIENTE' }, [entrega]);
    });
  } finally {
    try {
      if (publicaciones.length) {
        await pool.query('DELETE FROM entrega WHERE publicacionId IN (?)', [publicaciones]);
        await pool.query('DELETE FROM solicitud WHERE publicacionId IN (?)', [publicaciones]);
        await pool.query('DELETE FROM publicacion WHERE id IN (?) AND titulo = ?', [publicaciones, marca]);
      }
      await pool.query('DELETE FROM usuario WHERE correo IN (?) AND nombre = ?', [correos, marca]);
    } finally {
      server.close();
      await pool.end();
    }
  }
});
