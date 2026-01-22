"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const router = (0, express_1.Router)();
// GET /api/config - Configuración de la tienda
router.get('/config', async (req, res) => {
    try {
        const configs = await index_1.prisma.configuracion.findMany();
        const config = {};
        configs.forEach((c) => { config[c.clave] = c.valor; });
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener configuración' });
    }
});
// GET /api/categorias - Lista de categorías
router.get('/categorias', async (req, res) => {
    try {
        const categorias = await index_1.prisma.categoria.findMany({
            where: { activo: true },
            orderBy: { orden: 'asc' },
            include: {
                _count: { select: { productos: { where: { activo: true } } } }
            }
        });
        res.json(categorias);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});
// GET /api/productos - Lista de productos
router.get('/productos', async (req, res) => {
    try {
        const { categoria, destacados, buscar, limite } = req.query;
        const where = { activo: true };
        if (categoria) {
            where.categoriaId = categoria;
        }
        if (destacados === 'true') {
            where.destacado = true;
        }
        if (buscar) {
            where.OR = [
                { nombre: { contains: buscar, mode: 'insensitive' } },
                { descripcion: { contains: buscar, mode: 'insensitive' } }
            ];
        }
        const productos = await index_1.prisma.producto.findMany({
            where,
            include: {
                categoria: { select: { id: true, nombre: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: limite ? parseInt(limite) : undefined
        });
        res.json(productos);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});
// GET /api/productos/:id - Detalle de producto
router.get('/productos/:id', async (req, res) => {
    try {
        const producto = await index_1.prisma.producto.findUnique({
            where: { id: req.params.id },
            include: {
                categoria: { select: { id: true, nombre: true } }
            }
        });
        if (!producto || !producto.activo) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(producto);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});
// POST /api/pedidos - Crear pedido
router.post('/pedidos', async (req, res) => {
    try {
        const { items, nombreCliente, telefono, email, direccion, notas, usuarioId } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'El pedido debe tener al menos un producto' });
        }
        // Calcular totales
        let subtotal = 0;
        const itemsPedido = [];
        for (const item of items) {
            const producto = await index_1.prisma.producto.findUnique({ where: { id: item.productoId } });
            if (!producto) {
                return res.status(400).json({ error: `Producto ${item.productoId} no encontrado` });
            }
            const precio = producto.precioOferta || producto.precio;
            subtotal += precio * item.cantidad;
            itemsPedido.push({
                productoId: producto.id,
                nombre: producto.nombre,
                precio,
                cantidad: item.cantidad
            });
        }
        const envio = subtotal >= 50000 ? 0 : 5000; // Envío gratis +$50.000
        const total = subtotal + envio;
        const pedido = await index_1.prisma.pedido.create({
            data: {
                usuarioId,
                nombreCliente,
                telefono,
                email,
                direccion,
                notas,
                subtotal,
                envio,
                total,
                items: {
                    create: itemsPedido
                }
            },
            include: {
                items: true
            }
        });
        res.status(201).json(pedido);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear pedido' });
    }
});
exports.default = router;
//# sourceMappingURL=public.js.map