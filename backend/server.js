
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { probarConexion } = require('./config/db');
const publicacionesRoutes = require('./routes/publicaciones.routes');
const solicitudesRoutes = require('./routes/solicitudes.routes');
const authRoutes = require('./routes/auth.routes');
const { rutaNoEncontrada, manejarErrores } = require('./middlewares/manejoErrores');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Servidor ReUse Campus funcionando');
});

app.get('/api', (req, res) => {
    res.json({
        mensaje: 'Bienvenido a la API de ReUse Campus'
    });
});

// Rutas de la API
app.use('/api/publicaciones', publicacionesRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/auth', authRoutes);

// Siempre al final: 404 y manejo centralizado de errores
app.use(rutaNoEncontrada);
app.use(manejarErrores);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
    try {
        await probarConexion();
        console.log('Conectado a MySQL (base de datos: ' + (process.env.DB_NAME || 'reuse_campus') + ')');
    } catch (error) {
        console.error('No se pudo conectar a MySQL:', error.message);
        console.error('Revisa los datos DB_* de tu archivo backend/.env');
    }
});
