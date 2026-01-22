import { Router } from 'express'
import { prisma } from '../index'
import { verificarToken, soloAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

// Todas las rutas requieren autenticación de admin
router.use(verificarToken as any, soloAdmin as any)

// ============================================
// CONFIGURACIÓN
// ============================================

// GET /api/admin/config
router.get('/config', async (req, res) => {
    try {
        const configs = await prisma.configuracion.findMany()
        res.json(configs)
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener configuración' })
    }
})

// PUT /api/admin/config
router.put('/config', async (req, res) => {
    try {
        const { configs } = req.body // Array de { clave, valor }

        for (const config of configs) {
            await prisma.configuracion.upsert({
                where: { clave: config.clave },
                update: { valor: config.valor },
                create: { clave: config.clave, valor: config.valor }
            })
        }

        res.json({ message: 'Configuración actualizada' })
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar configuración' })
    }
})

// ============================================
// CATEGORÍAS
// ============================================

// GET /api/admin/categorias
router.get('/categorias', async (req, res) => {
    try {
        const categorias = await prisma.categoria.findMany({
            orderBy: { orden: 'asc' },
            include: { _count: { select: { productos: true } } }
        })
        res.json(categorias)
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener categorías' })
    }
})

// POST /api/admin/categorias
router.post('/categorias', async (req, res) => {
    try {
        const { nombre, descripcion, icono, color, orden, imagen } = req.body
        const slug = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const categoria = await prisma.categoria.create({
            data: { nombre, slug, descripcion, imagen, icono, color, orden }
        })
        res.status(201).json(categoria)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al crear categoría' })
    }
})

// PUT /api/admin/categorias/:id
router.put('/categorias/:id', async (req, res) => {
    try {
        const { nombre, descripcion, icono, color, orden, activo } = req.body
        const categoria = await prisma.categoria.update({
            where: { id: req.params.id },
            data: { nombre, descripcion, icono, color, orden, activo }
        })
        res.json(categoria)
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar categoría' })
    }
})

// DELETE /api/admin/categorias/:id
router.delete('/categorias/:id', async (req, res) => {
    try {
        await prisma.categoria.delete({ where: { id: req.params.id } })
        res.json({ message: 'Categoría eliminada' })
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar categoría' })
    }
})

// ============================================
// PRODUCTOS
// ============================================

// GET /api/admin/productos
router.get('/productos', async (req, res) => {
    try {
        const productos = await prisma.producto.findMany({
            orderBy: { createdAt: 'desc' },
            include: { categoria: { select: { id: true, nombre: true } } }
        })
        res.json(productos)
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos' })
    }
})

// POST /api/admin/productos
router.post('/productos', async (req, res) => {
    try {
        const { nombre, descripcion, descripcionCorta, precio, precioOferta, costo, sku, stock, stockMinimo, imagenes, video, peso, dimensiones, material, color, destacado, nuevo, categoriaId } = req.body
        const slug = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36)
        const producto = await prisma.producto.create({
            data: {
                nombre, slug, descripcion, descripcionCorta,
                precio, precioOferta, costo,
                sku, stock, stockMinimo,
                imagenes: imagenes || [], video,
                peso, dimensiones, material, color,
                destacado, nuevo,
                categoriaId
            }
        })
        res.status(201).json(producto)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al crear producto' })
    }
})

// PUT /api/admin/productos/:id
router.put('/productos/:id', async (req, res) => {
    try {
        const { nombre, descripcion, precio, precioOferta, stock, imagenes, destacado, activo, categoriaId } = req.body
        const producto = await prisma.producto.update({
            where: { id: req.params.id },
            data: { nombre, descripcion, precio, precioOferta, stock, imagenes, destacado, activo, categoriaId }
        })
        res.json(producto)
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar producto' })
    }
})

// DELETE /api/admin/productos/:id
router.delete('/productos/:id', async (req, res) => {
    try {
        await prisma.producto.delete({ where: { id: req.params.id } })
        res.json({ message: 'Producto eliminado' })
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar producto' })
    }
})

// ============================================
// PEDIDOS
// ============================================

// GET /api/admin/pedidos
router.get('/pedidos', async (req, res) => {
    try {
        const { estado } = req.query
        const where = estado ? { estado: estado as any } : {}

        const pedidos = await prisma.pedido.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                usuario: { select: { id: true, nombre: true, email: true } },
                items: true
            }
        })
        res.json(pedidos)
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener pedidos' })
    }
})

// PUT /api/admin/pedidos/:id
router.put('/pedidos/:id', async (req, res) => {
    try {
        const { estado } = req.body
        const pedido = await prisma.pedido.update({
            where: { id: req.params.id },
            data: { estado },
            include: { items: true }
        })
        res.json(pedido)
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar pedido' })
    }
})

// ============================================
// ESTADÍSTICAS
// ============================================

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
    try {
        const [
            totalProductos,
            totalCategorias,
            totalPedidos,
            pedidosPendientes,
            totalUsuarios
        ] = await Promise.all([
            prisma.producto.count({ where: { activo: true } }),
            prisma.categoria.count({ where: { activo: true } }),
            prisma.pedido.count(),
            prisma.pedido.count({ where: { estado: 'PENDIENTE' } }),
            prisma.usuario.count({ where: { rol: 'CLIENTE' } })
        ])

        res.json({
            totalProductos,
            totalCategorias,
            totalPedidos,
            pedidosPendientes,
            totalUsuarios
        })
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estadísticas' })
    }
})

export default router
