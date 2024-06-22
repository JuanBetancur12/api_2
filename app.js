const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();

const db = new sqlite3.Database('./yamix.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Conectado a la base de datos.');
        createTables(); 
    }
});

app.use(bodyParser.json());

// Función para crear las tablas 'usuarios', 'eventos' y 'asistencias'
function createTables() {
    const createUsuariosTable = `CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INTEGER PRIMARY KEY, 
        nombre TEXT, 
        apellido TEXT, 
        gmail TEXT, 
        contraseña TEXT, 
        roll TEXT, 
        clase TEXT
    )`;

    db.run(createUsuariosTable, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Tabla "usuarios" creada o ya existe.');
        }
    });

    const createEventosTable = `CREATE TABLE IF NOT EXISTS eventos (
        id_evento INTEGER PRIMARY KEY,
        nombre_evento VARCHAR(100),
        descripcion TEXT,
        tipo_evento VARCHAR(50),
        ubicacion VARCHAR(100),
        fecha_hora_inicio DATETIME,
        fecha_hora_final DATETIME
    )`;

    db.run(createEventosTable, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Tabla "eventos" creada o ya existe.');
        }
    });

    const createAsistenciasTable = `CREATE TABLE IF NOT EXISTS asistencias (
        id_asistencia INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER NOT NULL,
        nombre_usuario TEXT NOT NULL,
        apellido TEXT NOT NULL,
        clase TEXT NOT NULL,
        fecha_actual TEXT NOT NULL,
        estado_asistencia TEXT NOT NULL,
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
    )`;

    db.run(createAsistenciasTable, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Tabla "asistencias" creada o ya existe.');
        }
    });
}

// Ruta para manejar el inicio de sesión
app.post('/user/login', (req, res) => {
    const { gmail, contraseña } = req.body;
    const sql = 'SELECT * FROM usuarios WHERE gmail = ? AND contraseña = ?';
    db.get(sql, [gmail, contraseña], (err, row) => {
        if (err) {
            console.error('Error al buscar usuario:', err.message);
            res.status(500).json({ status: 500, success: false, error: 'Error al buscar usuario' });
        } else {
            if (row) {
                // Usuario encontrado, inicio de sesión exitoso
                const { id_usuario, nombre, apellido, gmail, roll} = row;
                res.status(200).json({ status: 200, success: true, data: { id_usuario, nombre, apellido, gmail, roll} });
            } else {
                // Usuario no encontrado o credenciales incorrectas
                res.status(404).json({ status: 404, success: false, message: 'Correo o contraseña incorrectos' });
            }
        }
    });
});

// Middleware para verificar el roll de profesor
function isTeacher(req, res, next) {
    const { roll } = req.user;
    if (roll === 'profesor') {
        next(); // Permitir acceso al siguiente middleware o controlador
    } else {
        res.status(403).json({ status: 403, success: false, message: 'No tiene permisos de profesor para acceder a este recurso' });
    }
}

// Ejemplo de autorización basada en roles en un endpoint protegido
app.get('/profesor/resource', isTeacher, (req, res) => {
    res.status(200).json({ status: 200, success: true, message: 'Bienvenido profesor' });
});

// Ruta para obtener nombres y apellidos de estudiantes
app.get('/usuarios/estudiantes', (req, res) => {
    const sql = `SELECT nombre_usuario, apellido FROM usuarios WHERE rol = 'estudiante'`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ estudiantes: rows });
    });
});

// Ruta para manejar el POST de usuarios
app.post('/user', (req, res) => {
    try {
        const { nombre, apellido, gmail, contraseña, roll, clase } = req.body;
        const sql = 'INSERT INTO usuarios (nombre, apellido, gmail, contraseña, roll, clase) VALUES (?, ?, ?, ?, ?, ?)';
        db.run(sql, [nombre, apellido, gmail, contraseña, roll, clase ], function(err) {
            if (err) {
                console.error('Error al insertar usuario: ' + err.message);
                res.status(400).json({ status: 400, success: false });
            } else {
                console.log(`Usuario agregado con ID: ${this.lastID}`);
                res.status(201).json({ status: 201, success: true, id: this.lastID });
            }
        });
    } catch (error) {
        console.error('Error en la solicitud POST: ' + error.message);
        res.status(500).json({ status: 500, success: false });
    }
});

// Ruta para verificar si el correo existe en la base de datos
app.get('/user/check-email/:email', (req, res) => {
    const email = req.params.email;
    const sql = 'SELECT gmail FROM usuarios WHERE gmail = ?';
    db.get(sql, [email], (err, row) => {
        if (err) {
            console.error('Error al verificar el correo:', err.message);
            res.status(500).json({ status: 500, success: false, error: 'Error al verificar el correo' });
        } else {
            if (row) {
                res.status(200).json({ status: 200, success: true, message: 'Correo encontrado' });
            } else {
                res.status(404).json({ status: 404, success: false, message: 'Correo no encontrado' });
            }
        }
    });
});

// Ruta para obtener todos los usuarios
app.get('/users', (req, res) => {
    const sql = 'SELECT * FROM usuarios';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener usuarios:', err.message);
            return res.status(500).json({ status: 500, success: false, error: 'Error al obtener usuarios' });
        }
        if (rows.length === 0) {
            return res.status(404).json({ status: 404, success: false, message: 'No se encontraron usuarios' });
        }
        res.status(200).json({ status: 200, success: true, data: rows });
    });
});

// Ruta para obtener un usuario por ID
app.get('/user/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM usuarios WHERE id_usuario = ?';
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('Error al obtener usuario por ID: ' + err.message);
            res.status(500).json({ status: 500, success: false });
        } else {
            if (row) {
                res.json({ status: 200, success: true, data: row });
            } else {
                res.status(404).json({ status: 404, success: false, message: `Usuario con ID ${id} no encontrado` });
            }
        }
    });
});

// Ruta para actualizar un usuario por ID
app.put('/user/:id', (req, res) => {
    const id = req.params.id;
    const { nombre, apellido, gmail, contraseña, roll, clase } = req.body;
    const sql = 'UPDATE usuarios SET nombre = ?, apellido = ?, gmail = ?, contraseña = ?, roll = ?, clase = ? WHERE id_usuario = ?';
    db.run(sql, [nombre, apellido, gmail, contraseña, roll, clase, id], function(err) {
        if (err) {
            console.error('Error al actualizar usuario: ' + err.message);
            res.status(400).json({ status: 400, success: false });
        } else {
            if (this.changes > 0) {
                console.log(`Usuario con ID ${id} actualizado.`);
                res.status(200).json({ status: 200, success: true });
            } else {
                res.status(404).json({ status: 404, success: false, message: `Usuario con ID ${id} no encontrado` });
            }
        }
    });
});

// Ruta para eliminar un usuario por ID
app.delete('/user/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM usuarios WHERE id_usuario = ?';
    db.run(sql, id, function(err) {
        if (err) {
            console.error('Error al eliminar usuario: ' + err.message);
            res.status(500).json({ status: 500, success: false });
        } else {
            if (this.changes > 0) {
                console.log(`Usuario con ID ${id} eliminado.`);
                res.status(200).json({ status: 200, success: true });
            } else {
                res.status(404).json({ status: 404, success: false, message: `Usuario con ID ${id} no encontrado` });
                res.status(404).json({ status: 404, success: false, message: `Usuario con ID ${id} no encontrado` });
            }
        }
    });
});

// Métodos CRUD para la tabla 'eventos'

// Ruta para crear un nuevo evento
app.post('/evento', (req, res) => {
    const { nombre_evento, descripcion, tipo_evento, ubicacion, fecha_hora_inicio, fecha_hora_final } = req.body;
    const sql = `INSERT INTO eventos (nombre_evento, descripcion, tipo_evento, ubicacion, fecha_hora_inicio, fecha_hora_final) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [nombre_evento, descripcion, tipo_evento, ubicacion, fecha_hora_inicio, fecha_hora_final], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.status(201).json({ message: 'Evento creado correctamente', evento: { id: this.lastID, nombre_evento, descripcion, tipo_evento, ubicacion, fecha_hora_inicio, fecha_hora_final } });
    });
});

// Ruta para obtener todos los eventos
app.get('/eventos', (req, res) => {
    const sql = `SELECT * FROM eventos`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ eventos: rows });
    });
});

// Ruta para actualizar un evento por ID
app.put('/eventos/:id', (req, res) => {
    const { nombre_evento, descripcion, tipo_evento, ubicacion, fecha_hora_inicio, fecha_hora_final } = req.body;
    const sql = `UPDATE eventos SET nombre_evento = ?, descripcion = ?, tipo_evento = ?, ubicacion = ?, fecha_hora_inicio = ?, fecha_hora_final = ? WHERE id_evento = ?`;
    db.run(sql, [nombre_evento, descripcion, tipo_evento, ubicacion, fecha_hora_inicio, fecha_hora_final, req.params.id], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }
        res.json({ message: 'Evento actualizado correctamente', updatedID: req.params.id });
    });
});

// Ruta para eliminar un evento por ID
app.delete('/eventos/:id', (req, res) => {
    const sql = `DELETE FROM eventos WHERE id_evento = ?`;
    db.run(sql, req.params.id, function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }
        res.json({ message: 'Evento eliminado correctamente', deletedID: req.params.id });
    });
});

// Métodos CRUD para la tabla 'asistencias'

// Ruta para registrar una nueva asistencia
app.post('/asistencia', (req, res) => {
    const { id_usuario, nombre_usuario, apellido, clase, fecha_actual, estado_asistencia } = req.body;
    const sql = `INSERT INTO asistencias (id_usuario, nombre_usuario, apellido, clase, fecha_actual, estado_asistencia) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [id_usuario, nombre_usuario, apellido, clase, fecha_actual, estado_asistencia], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.status(201).json({ message: 'Asistencia registrada correctamente', asistencia: { id: this.lastID, id_usuario, nombre_usuario, apellido, clase, fecha_actual, estado_asistencia } });
    });
});

// Ruta para obtener todas las asistencias
app.get('/asistencias', (req, res) => {
    const sql = `SELECT * FROM asistencias`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ asistencias: rows });
    });
});

// Ruta para actualizar una asistencia por ID
app.put('/asistencia/:id', (req, res) => {
    const id = req.params.id;
    const { estado_asistencia } = req.body; // Obtener el nuevo estado de asistencia desde el cuerpo de la solicitud

    // Validar que se haya enviado el estado de asistencia
    if (!estado_asistencia) {
        return res.status(400).json({ error: 'Estado de asistencia no proporcionado' });
    }

    const sql = `UPDATE asistencias 
                SET estado_asistencia = ?
                WHERE id_asistencia = ?`;

    db.run(sql, [estado_asistencia, id], function(err) {
        if (err) {
            console.error('Error al actualizar asistencia: ' + err.message);
            return res.status(400).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Asistencia no encontrada' });
        }

        res.json({ message: 'Asistencia actualizada correctamente', updatedID: id });
    });
});

// Ruta para eliminar una asistencia por ID
app.delete('/asistencia/:id', (req, res) => {
    const sql = `DELETE FROM asistencias WHERE id_asistencia = ?`;
    db.run(sql, req.params.id, function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Asistencia no encontrada' });
        }
        res.json({ message: 'Asistencia eliminada correctamente', deletedID: req.params.id });
    });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
});
