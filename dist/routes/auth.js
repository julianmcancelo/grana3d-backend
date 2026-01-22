"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const router = (0, express_1.Router)();
// POST /api/auth/registro
router.post('/registro', async (req, res) => {
    try {
        const { nombre, email, password, telefono } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
        }
        const existente = await index_1.prisma.usuario.findUnique({ where: { email } });
        if (existente) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const usuario = await index_1.prisma.usuario.create({
            data: {
                nombre,
                email,
                password: hashedPassword,
                telefono,
                rol: 'CLIENTE'
            },
            select: { id: true, nombre: true, email: true, rol: true }
        });
        const token = jsonwebtoken_1.default.sign({ id: usuario.id }, process.env.JWT_SECRET, {
            expiresIn: (process.env.JWT_EXPIRES_IN || '7d')
        });
        res.status(201).json({ usuario, token });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }
        const usuario = await index_1.prisma.usuario.findUnique({ where: { email } });
        if (!usuario) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const passwordValido = await bcryptjs_1.default.compare(password, usuario.password);
        if (!passwordValido) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const token = jsonwebtoken_1.default.sign({ id: usuario.id }, process.env.JWT_SECRET, {
            expiresIn: (process.env.JWT_EXPIRES_IN || '7d')
        });
        res.json({
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            },
            token
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});
// GET /api/auth/me
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const usuario = await index_1.prisma.usuario.findUnique({
            where: { id: decoded.id },
            select: { id: true, nombre: true, email: true, rol: true, telefono: true }
        });
        if (!usuario) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        res.json({ usuario });
    }
    catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map