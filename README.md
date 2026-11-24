# ReUse Campus

Plataforma web para donar e intercambiar artículos
entre integrantes de una comunidad educativa.

## Tecnologías
- Angular
- Node.js
- Express
- MySQL

## Requisitos

- Node.js 24 y npm 11.
- MySQL 8 con un usuario autorizado para trabajar en la base local.
- Dos terminales para ejecutar Express y Angular.

## Instalación local

1. En una instancia de desarrollo desechable, abre `database/reuse_campus.sql` en MySQL Workbench y ejecútalo. El script elimina y vuelve a crear `reuse_campus`, con datos de demostración. Usa una instancia sin datos que necesites conservar.
2. Copia `backend/.env.example` a `backend/.env`. Configura `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` según tu instancia. Genera un valor local para `JWT_SECRET` con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` y guárdalo en el archivo ignorado por Git.
3. Desde `backend`, ejecuta `npm ci` y luego `npm start`. Express escucha en `http://localhost:3000` por defecto. Comprueba que la consola confirme la conexión a MySQL.
4. Desde `frontend`, ejecuta `npm ci` y luego `npm start`. Abre `http://localhost:4200`. Si cambias el puerto del backend, ajusta `API_URL` en `frontend/src/app/core/api.config.ts`.

## API

La base de las rutas es `/api`. Las operaciones protegidas reciben el token devuelto por el login en `Authorization: Bearer <token>`.

| Método y ruta | Acceso |
| --- | --- |
| `POST /auth/registro`, `POST /auth/login` | Público |
| `GET /auth/perfil` | Sesión activa |
| `GET /auth/admin` | Administrador |
| `GET /publicaciones`, `GET /publicaciones/:id` | Público |
| `POST /publicaciones` | Sesión activa |
| `PUT /publicaciones/:id`, `DELETE /publicaciones/:id` | Propietario |
| `GET /solicitudes`, `GET /solicitudes/:id` | Solicitante, propietario o administrador según el recurso |
| `POST /solicitudes` | Sesión activa y publicación disponible de otro usuario |
| `PATCH /solicitudes/:id/cancelar` | Solicitante |
| `PATCH /solicitudes/:id/aceptar`, `PATCH /solicitudes/:id/rechazar` | Propietario de la publicación |
| `GET /entregas`, `GET /entregas/:id` | Propietario o receptor de la entrega; el administrador ve todas |
| `PATCH /entregas/:id/confirmar` | Propietario o receptor, solo si la entrega está `PENDIENTE` |

## Pruebas

| Comando | Directorio | Cobertura |
| --- | --- | --- |
| `npm run build` | `frontend` | Compilación de producción |
| `npm test -- --watch=false` | `frontend` | Navegación, guard, interceptor y aceptación en Angular con HTTP simulado |
| `node --test tests/solicitudes.integration.test.js` | `backend` | API con MySQL, permisos, estados, concurrencia y reversión |
| `git diff --check` | Raíz | Errores de espacios en el diff |

La prueba de integración arranca Express en un puerto temporal y usa la configuración de `backend/.env`. Apúntala a una base de pruebas. Crea usuarios y publicaciones con un identificador `tarea8-` y elimina sus registros al finalizar. Para comprobar el esquema manualmente, ejecuta las consultas de `database/pruebas_tarea2.sql` una por una sobre una base desechable. El archivo incluye operaciones que deben fallar por restricciones.

## Recorrido de demostración

1. En la base de demostración, inicia sesión como `ana@reusecampus.cl` y crea una publicación. Las cuentas de ejemplo comparten la clave de demostración indicada en `database/reuse_campus.sql`.
2. Cierra sesión, entra como `bruno@reusecampus.cl` y solicita el artículo. Verifica que aparezca en **Mis solicitudes → Enviadas**. Cancélala y envía una nueva.
3. Entra como `carla@reusecampus.cl` y envía otra solicitud al mismo artículo.
4. Vuelve a la cuenta de Ana. En **Mis solicitudes → Recibidas**, acepta una de las dos pendientes. Verifica que la seleccionada quede `ACEPTADA`, la otra `RECHAZADA` y la publicación `RESERVADA`.
5. En otra publicación, rechaza una solicitud individual y verifica que la publicación siga `DISPONIBLE`. Tras cerrar sesión, comprueba que abrir `/publicaciones/nueva`, `/publicaciones/:id/editar` o `/mis-solicitudes` redirige al login.

6. Al aceptar una solicitud se crea una entrega `PENDIENTE`. Como Ana o como el solicitante aceptado, abre **Mis entregas** y pulsa **Confirmar entrega**. Verifica que la entrega pase al **Historial** como `COMPLETADA`, con su fecha, y que la publicación quede `ENTREGADA`. Un usuario que no participa no puede ver ni confirmar la entrega, y una entrega ya confirmada no se puede confirmar de nuevo.

## Autores
- Matias Aedo
- Vasco Zambrano
