"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación de admin
router.use(auth_1.verificarToken, auth_1.soloAdmin);
// ============================================
// CONFIGURACIÓN
// ============================================
// GET /api/admin/config
router.get('/config', async (req, res) => {
    try {
        const configs = await index_1.prisma.configuracion.findMany();
        res.json(configs);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener configuración' });
    }
});
// PUT /api/admin/config
router.put('/config', async (req, res) => {
    try {
        const { configs } = req.body; // Array de { clave, valor }
        for (const config of configs) {
            await index_1.prisma.configuracion.upsert({
                where: { clave: config.clave },
                update: { valor: config.valor },
                create: { clave: config.clave, valor: config.valor }
            });
        }
        res.json({ message: 'Configuración actualizada' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al actualizar configuración' });
    }
});
// ============================================
// CATEGORÍAS
// ============================================
// GET /api/admin/categorias
router.get('/categorias', async (req, res) => {
    try {
        const categorias = await index_1.prisma.categoria.findMany({
            orderBy: { orden: 'asc' },
            include: { _count: { select: { productos: true } } }
        });
        res.json(categorias);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});
// POST /api/admin/categorias
router.post('/categorias', async (req, res) => {
    try {
        const { nombre, descripcion, icono, color, orden } = req.body;
        const categoria = await index_1.prisma.categoria.create({
            data: { nombre, descripcion, icono, color, orden }
        });
        res.status(201).json(categoria);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear categoría' });
    }
});
// PUT /api/admin/categorias/:id
router.put('/categorias/:id', async (req, res) => {
    try {
        const { nombre, descripcion, icono, color, orden, activo } = req.body;
        const categoria = await index_1.prisma.categoria.update({
            where: { id: req.params.id },
            data: { nombre, descripcion, icono, color, orden, activo }
        });
        res.json(categoria);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al actualizar categoría' });
    }
});
// DELETE /api/admin/categorias/:id
router.delete('/categorias/:id', async (req, res) => {
    try {
        await index_1.prisma.categoria.delete({ where: { id: req.params.id } });
        res.json({ message: 'Categoría eliminada' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al eliminar categoría' });
    }
});
// ============================================
// PRODUCTOS
// ============================================
// GET /api/admin/productos
router.get('/productos', async (req, res) => {
    try {
        const productos = await index_1.prisma.producto.findMany({
            orderBy: { createdAt: 'desc' },
            include: { categoria: { select: { id: true, nombre: true } } }
        });
        res.json(productos);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});
// POST /api/admin/productos
router.post('/productos', async (req, res) => {
    try {
        const { nombre, descripcion, precio, precioOferta, stock, imagenes, destacado, categoriaId } = req.body;
        const producto = await index_1.prisma.producto.create({
            data: { nombre, descripcion, precio, precioOferta, stock, imagenes, destacado, categoriaId }
        });
        res.status(201).json(producto);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});
// PUT /api/admin/productos/:id
router.put('/productos/:id', async (req, res) => {
    try {
        const { nombre, descripcion, precio, precioOferta, stock, imagenes, destacado, activo, categoriaId } = req.body;
        const producto = await index_1.prisma.producto.update({
            where: { id: req.params.id },
            data: { nombre, descripcion, precio, precioOferta, stock, imagenes, destacado, activo, categoriaId }
        });
        res.json(producto);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});
// DELETE /api/admin/productos/:id
router.delete('/productos/:id', async (req, res) => {
    try {
        await index_1.prisma.producto.delete({ where: { id: req.params.id } });
        res.json({ message: 'Producto eliminado' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});
// ============================================
// PEDIDOS
// ============================================
// GET /api/admin/pedidos
router.get('/pedidos', async (req, res) => {
    try {
        const { estado } = req.query;
        const where = estado ? { estado: estado } : {};
        const pedidos = await index_1.prisma.pedido.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                usuario: { select: { id: true, nombre: true, email: true } },
                items: true
            }
        });
        res.json(pedidos);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
});
// PUT /api/admin/pedidos/:id
router.put('/pedidos/:id', async (req, res) => {
    try {
        const { estado } = req.body;
        const pedido = await index_1.prisma.pedido.update({
            where: { id: req.params.id },
            data: { estado },
            include: { items: true }
        });
        res.json(pedido);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al actualizar pedido' });
    }
});
// ============================================
// ESTADÍSTICAS
// ============================================
// GET /api/admin/stats
router.get('/stats', async (req, res) => {
    try {
        const [totalProductos, totalCategorias, totalPedidos, pedidosPendientes, totalUsuarios] = await Promise.all([
            index_1.prisma.producto.count({ where: { activo: true } }),
            index_1.prisma.categoria.count({ where: { activo: true } }),
            index_1.prisma.pedido.count(),
            index_1.prisma.pedido.count({ where: { estado: 'PENDIENTE' } }),
            index_1.prisma.usuario.count({ where: { rol: 'CLIENTE' } })
        ]);
        res.json({
            totalProductos,
            totalCategorias,
            totalPedidos,
            pedidosPendientes,
            totalUsuarios
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map