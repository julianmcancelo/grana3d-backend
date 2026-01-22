"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.soloAdmin = exports.verificarToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const verificarToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const usuario = await index_1.prisma.usuario.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, rol: true }
        });
        if (!usuario) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        req.usuario = usuario;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};
exports.verificarToken = verificarToken;
const soloAdmin = (req, res, next) => {
    if (req.usuario?.rol !== 'ADMIN') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }
    next();
};
exports.soloAdmin = soloAdmin;
//# sourceMappingURL=auth.js.map