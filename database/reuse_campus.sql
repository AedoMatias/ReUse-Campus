-- =============================================================
--  ReUse Campus - Base de datos MySQL
--  Tarea 2: Crear la base de datos y sus relaciones
--
--  Entidades:
--    usuario      -> personas que usan la plataforma
--    publicacion  -> artículos que un usuario dona o intercambia
--    solicitud    -> pedido de un usuario sobre una publicación ajena
--    entrega      -> acuerdo de entrega/intercambio entre propietario y receptor
--
--  Relaciones:
--    usuario 1 ── N publicacion   (un usuario publica muchos artículos)
--    usuario 1 ── N solicitud     (un usuario hace muchas solicitudes)
--    publicacion 1 ── N solicitud (una publicación recibe muchas solicitudes)
--    solicitud 1 ── 0..1 entrega  (una solicitud aceptada genera una entrega)
--    publicacion 1 ── N entrega   (si una entrega se cancela, puede haber otra)
--    usuario 1 ── N entrega       (como propietario y como receptor)
--
--  Ejecutar completo en MySQL Workbench (rayo ⚡) o con:
--    mysql -u root -p < database/reuse_campus.sql
--  ATENCIÓN: borra y vuelve a crear la base de datos reuse_campus.
-- =============================================================

DROP DATABASE IF EXISTS reuse_campus;

CREATE DATABASE reuse_campus
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE reuse_campus;

-- -------------------------------------------------------------
-- Tabla usuario
-- -------------------------------------------------------------
CREATE TABLE usuario (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre    VARCHAR(100) NOT NULL,
  correo    VARCHAR(150) NOT NULL,
  password  VARCHAR(255) NOT NULL,                -- se guarda cifrada (hash bcrypt), nunca en texto plano
  rol       ENUM('USUARIO', 'ADMINISTRADOR') NOT NULL DEFAULT 'USUARIO',
  estado    ENUM('ACTIVO', 'BLOQUEADO')      NOT NULL DEFAULT 'ACTIVO',

  CONSTRAINT pk_usuario PRIMARY KEY (id),
  CONSTRAINT uq_usuario_correo UNIQUE (correo),  -- no puede haber dos cuentas con el mismo correo
  CONSTRAINT chk_usuario_nombre CHECK (CHAR_LENGTH(TRIM(nombre)) >= 2),
  CONSTRAINT chk_usuario_correo CHECK (correo LIKE '%_@_%._%')
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Tabla publicacion
-- -------------------------------------------------------------
CREATE TABLE publicacion (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo            VARCHAR(150) NOT NULL,
  descripcion       TEXT         NOT NULL,
  categoria         ENUM('LIBROS', 'TECNOLOGIA', 'ROPA', 'MUEBLES', 'UTILES', 'DEPORTES', 'OTROS') NOT NULL,
  modalidad         ENUM('DONACION', 'INTERCAMBIO') NOT NULL,
  estado            ENUM('DISPONIBLE', 'RESERVADA', 'ENTREGADA', 'CANCELADA') NOT NULL DEFAULT 'DISPONIBLE',
  fechaPublicacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuarioId         INT UNSIGNED NOT NULL,          -- dueño de la publicación

  CONSTRAINT pk_publicacion PRIMARY KEY (id),
  CONSTRAINT fk_publicacion_usuario
    FOREIGN KEY (usuarioId) REFERENCES usuario (id),
  CONSTRAINT chk_publicacion_titulo CHECK (CHAR_LENGTH(TRIM(titulo)) >= 3)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Tabla solicitud
-- -------------------------------------------------------------
CREATE TABLE solicitud (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  publicacionId   INT UNSIGNED NOT NULL,
  solicitanteId   INT UNSIGNED NOT NULL,
  mensaje         VARCHAR(500) NOT NULL,
  fechaSolicitud  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado          ENUM('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',

  -- Columna calculada: vale "publicacionId-solicitanteId" solo cuando la solicitud
  -- está PENDIENTE; en cualquier otro estado vale NULL.
  -- Al ponerle UNIQUE, MySQL impide dos solicitudes PENDIENTES del mismo usuario
  -- para la misma publicación (los NULL no cuentan como repetidos).
  -- Es una segunda barrera: la validación principal se hace en el backend (Tarea 6).
  pendienteUnica  VARCHAR(30) GENERATED ALWAYS AS (
                    IF(estado = 'PENDIENTE', CONCAT(publicacionId, '-', solicitanteId), NULL)
                  ) STORED,

  CONSTRAINT pk_solicitud PRIMARY KEY (id),
  CONSTRAINT fk_solicitud_publicacion
    FOREIGN KEY (publicacionId) REFERENCES publicacion (id),
  CONSTRAINT fk_solicitud_solicitante
    FOREIGN KEY (solicitanteId) REFERENCES usuario (id),
  CONSTRAINT uq_solicitud_pendiente UNIQUE (pendienteUnica),
  CONSTRAINT chk_solicitud_mensaje CHECK (CHAR_LENGTH(TRIM(mensaje)) >= 5)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Tabla entrega (Entrega / Intercambio)
-- -------------------------------------------------------------
CREATE TABLE entrega (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  publicacionId  INT UNSIGNED NOT NULL,
  solicitudId    INT UNSIGNED NOT NULL,
  propietarioId  INT UNSIGNED NOT NULL,   -- quien entrega el artículo (dueño de la publicación)
  receptorId     INT UNSIGNED NOT NULL,   -- quien recibe el artículo (el solicitante)
  fechaAcuerdo   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fechaEntrega   DATETIME     NULL,       -- se completa al confirmar la entrega
  estado         ENUM('PENDIENTE', 'COMPLETADA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',

  CONSTRAINT pk_entrega PRIMARY KEY (id),
  CONSTRAINT uq_entrega_solicitud UNIQUE (solicitudId),  -- una solicitud genera como máximo una entrega
  CONSTRAINT fk_entrega_publicacion
    FOREIGN KEY (publicacionId) REFERENCES publicacion (id),
  CONSTRAINT fk_entrega_solicitud
    FOREIGN KEY (solicitudId) REFERENCES solicitud (id),
  CONSTRAINT fk_entrega_propietario
    FOREIGN KEY (propietarioId) REFERENCES usuario (id),
  CONSTRAINT fk_entrega_receptor
    FOREIGN KEY (receptorId) REFERENCES usuario (id),
  -- Nadie puede entregarse un artículo a sí mismo
  CONSTRAINT chk_entrega_participantes CHECK (propietarioId <> receptorId),
  -- Una entrega COMPLETADA debe tener fecha de entrega
  CONSTRAINT chk_entrega_fecha CHECK (estado <> 'COMPLETADA' OR fechaEntrega IS NOT NULL),
  -- La fecha de entrega no puede ser anterior al acuerdo
  CONSTRAINT chk_entrega_orden_fechas CHECK (fechaEntrega IS NULL OR fechaEntrega >= fechaAcuerdo)
) ENGINE = InnoDB;

-- =============================================================
--  Datos de prueba
--  Todos los usuarios de prueba tienen la contraseña: Clave123
--  (guardada como hash bcrypt, que es lo que usará el login de la Tarea 5)
-- =============================================================

INSERT INTO usuario (nombre, correo, password, rol, estado) VALUES
  ('Administrador ReUse', 'admin@reusecampus.cl', '$2a$10$25IwZYYy2bREEVApr/C.iu8uaFRvDQ6fz334FcY2/KDv2tobt6TxO', 'ADMINISTRADOR', 'ACTIVO'),
  ('Ana Torres',          'ana@reusecampus.cl',   '$2a$10$25IwZYYy2bREEVApr/C.iu8uaFRvDQ6fz334FcY2/KDv2tobt6TxO', 'USUARIO',       'ACTIVO'),
  ('Bruno Díaz',          'bruno@reusecampus.cl', '$2a$10$25IwZYYy2bREEVApr/C.iu8uaFRvDQ6fz334FcY2/KDv2tobt6TxO', 'USUARIO',       'ACTIVO'),
  ('Carla Muñoz',         'carla@reusecampus.cl', '$2a$10$25IwZYYy2bREEVApr/C.iu8uaFRvDQ6fz334FcY2/KDv2tobt6TxO', 'USUARIO',       'ACTIVO'),
  ('Diego Rojas',         'diego@reusecampus.cl', '$2a$10$25IwZYYy2bREEVApr/C.iu8uaFRvDQ6fz334FcY2/KDv2tobt6TxO', 'USUARIO',       'BLOQUEADO');

INSERT INTO publicacion (titulo, descripcion, categoria, modalidad, estado, fechaPublicacion, usuarioId) VALUES
  ('Libro Cálculo I',        'Libro de Cálculo de Stewart, 7ª edición, en buen estado.', 'LIBROS',     'DONACION',    'DISPONIBLE', '2026-11-01 10:00:00', 2),
  ('Calculadora científica', 'Casio fx-570, funciona perfecto. Busco cambiarla por audífonos.', 'TECNOLOGIA', 'INTERCAMBIO', 'RESERVADA',  '2026-11-02 12:30:00', 2),
  ('Polerón institucional',  'Talla M, usado pocas veces.',                              'ROPA',       'DONACION',    'ENTREGADA',  '2026-11-03 09:15:00', 3),
  ('Silla de escritorio',    'Silla con ruedas, le falta un poco de espuma.',            'MUEBLES',    'DONACION',    'DISPONIBLE', '2026-11-05 16:45:00', 4),
  ('Set de reglas y compás', 'Ideal para dibujo técnico.',                               'UTILES',     'INTERCAMBIO', 'DISPONIBLE', '2026-11-06 11:20:00', 3);

INSERT INTO solicitud (publicacionId, solicitanteId, mensaje, fechaSolicitud, estado) VALUES
  (1, 3, 'Hola, me serviría mucho para el ramo de Cálculo.',     '2026-11-04 08:00:00', 'PENDIENTE'),
  (2, 4, 'Te la cambio por unos audífonos bluetooth.',           '2026-11-04 09:30:00', 'ACEPTADA'),
  (2, 3, 'Me interesa la calculadora, ¿la cambias por un libro?', '2026-11-04 10:00:00', 'RECHAZADA'),
  (3, 2, 'Me queda perfecto, ¿cuándo lo puedo retirar?',          '2026-11-04 11:00:00', 'ACEPTADA'),
  (4, 2, 'Necesito una silla para estudiar en casa.',             '2026-11-06 14:00:00', 'CANCELADA');

INSERT INTO entrega (publicacionId, solicitudId, propietarioId, receptorId, fechaAcuerdo, fechaEntrega, estado) VALUES
  (2, 2, 2, 4, '2026-11-05 10:00:00', NULL,                  'PENDIENTE'),
  (3, 4, 3, 2, '2026-11-05 12:00:00', '2026-11-07 13:00:00', 'COMPLETADA');
