-- =============================================================
--  ReUse Campus - Pruebas de la base de datos (Tarea 2)
--
--  Ejecuta primero database/reuse_campus.sql.
--  Luego ejecuta estas consultas UNA POR UNA en MySQL Workbench:
--  pon el cursor sobre la consulta y presiona Ctrl + Enter.
-- =============================================================

USE reuse_campus;

-- -------------------------------------------------------------
-- PARTE A: consultas que DEBEN funcionar
-- -------------------------------------------------------------

-- A1. Ver las 4 tablas creadas
SHOW TABLES;

-- A2. Cantidad de registros de prueba (esperado: 5, 5, 5, 2)
SELECT
  (SELECT COUNT(*) FROM usuario)     AS usuarios,
  (SELECT COUNT(*) FROM publicacion) AS publicaciones,
  (SELECT COUNT(*) FROM solicitud)   AS solicitudes,
  (SELECT COUNT(*) FROM entrega)     AS entregas;

-- A3. Publicaciones con el nombre de su dueño (JOIN usuario-publicacion)
SELECT p.id, p.titulo, p.modalidad, p.estado, u.nombre AS propietario
FROM publicacion p
JOIN usuario u ON u.id = p.usuarioId;

-- A4. Solicitudes con su publicación y su solicitante
SELECT s.id, p.titulo, u.nombre AS solicitante, s.estado
FROM solicitud s
JOIN publicacion p ON p.id = s.publicacionId
JOIN usuario u     ON u.id = s.solicitanteId;

-- A5. Historial: artículos entregados (base de la Tarea 8)
SELECT e.id, p.titulo, prop.nombre AS propietario, rec.nombre AS receptor, e.fechaEntrega
FROM entrega e
JOIN publicacion p ON p.id   = e.publicacionId
JOIN usuario prop  ON prop.id = e.propietarioId
JOIN usuario rec   ON rec.id  = e.receptorId
WHERE e.estado = 'COMPLETADA';

-- A6. Ver las claves foráneas que se crearon
SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'reuse_campus' AND REFERENCED_TABLE_NAME IS NOT NULL;

-- -------------------------------------------------------------
-- PARTE B: consultas que DEBEN FALLAR (prueban las restricciones)
-- Si alguna de estas funciona, la restricción no está bien.
-- -------------------------------------------------------------

-- B1. Correo repetido -> Error 1062 Duplicate entry (uq_usuario_correo)
INSERT INTO usuario (nombre, correo, password) VALUES ('Otra Ana', 'ana@reusecampus.cl', 'x');

-- B2. Rol inexistente -> Error 1265 Data truncated for column 'rol'
INSERT INTO usuario (nombre, correo, password, rol) VALUES ('Pepe', 'pepe@reusecampus.cl', 'x', 'SUPERADMIN');

-- B3. Publicación de un usuario que no existe -> Error 1452 (fk_publicacion_usuario)
INSERT INTO publicacion (titulo, descripcion, categoria, modalidad, usuarioId)
VALUES ('Mochila', 'Mochila negra', 'OTROS', 'DONACION', 999);

-- B4. Modalidad inválida -> Error 1265 Data truncated for column 'modalidad'
INSERT INTO publicacion (titulo, descripcion, categoria, modalidad, usuarioId)
VALUES ('Mochila', 'Mochila negra', 'OTROS', 'VENTA', 2);

-- B5. Segunda solicitud PENDIENTE del mismo usuario a la misma publicación
--     (Bruno ya tiene una pendiente sobre la publicación 1) -> Error 1062 (uq_solicitud_pendiente)
INSERT INTO solicitud (publicacionId, solicitanteId, mensaje) VALUES (1, 3, 'La quiero de nuevo, por favor.');

-- B6. Entrega donde propietario y receptor son la misma persona -> Error 3819 (chk_entrega_participantes)
INSERT INTO entrega (publicacionId, solicitudId, propietarioId, receptorId) VALUES (1, 1, 2, 2);

-- B7. Entrega COMPLETADA sin fecha de entrega -> Error 3819 (chk_entrega_fecha)
UPDATE entrega SET estado = 'COMPLETADA' WHERE id = 1;

-- B8. Borrar un usuario que tiene publicaciones -> Error 1451 (protege el historial)
DELETE FROM usuario WHERE id = 2;

-- -------------------------------------------------------------
-- PARTE C: una solicitud CANCELADA no bloquea volver a solicitar
-- -------------------------------------------------------------

-- C1. Ana canceló su solicitud a la silla (publicación 4); puede volver a pedirla -> DEBE funcionar
INSERT INTO solicitud (publicacionId, solicitanteId, mensaje) VALUES (4, 2, 'Lo pensé mejor, sí la necesito.');

-- C2. Deshacer la prueba C1
DELETE FROM solicitud WHERE publicacionId = 4 AND solicitanteId = 2 AND estado = 'PENDIENTE';
