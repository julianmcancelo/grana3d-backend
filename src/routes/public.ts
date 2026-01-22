import { Router } from 'express'
import { prisma } from '../index'

const router = Router()

// GET /api/config - Configuración de la tienda
router.get('/config', async (req, res) => {
    try {
        const configs = await prisma.configuracion.findMany()
        const config: Record<string, string> = {}
        configs.forEach((c: { clave: string; valor: string }) => { config[c.clave] = c.valor })
        res.json(config)
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener configuración' })
    }
})

// GET /api/categorias - Lista de categorías
router.get('/categorias', async (req, res) => {
    try {
        const categorias = await prisma.categoria.findMany({
            where: { activo: true },
            orderBy: { orden: 'asc' },
            include: {
                _count: { select: { productos: { where: { activo: true } } } }
            }
        })
        res.json(categorias)
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener categorías' })
    }
})

// GET /api/productos - Lista de productos
router.get('/productos', async (req, res) => {
    try {
        const { categoria, destacados, buscar, limite } = req.query

        const where: any = { activo: true }

        if (categoria) {
            where.categoriaId = categoria as string
        }

        if (destacados === 'true') {
            where.destacado = true
        }

        if (buscar) {
            where.OR = [
                { nombre: { contains: buscar as string, mode: 'insensitive' } },
                { descripcion: { contains: buscar as string, mode: 'insensitive' } }
            ]
        }

        const productos = await prisma.producto.findMany({
            where,
            include: {
                categoria: { select: { id: true, nombre: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: limite ? parseInt(limite as string) : undefined
        })

        res.json(productos)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al obtener productos' })
    }
})

// GET /api/productos/:id - Detalle de producto
router.get('/productos/:id', async (req, res) => {
    try {
        const producto = await prisma.producto.findUnique({
            where: { id: req.params.id },
            include: {
                categoria: { select: { id: true, nombre: true } }
            }
        })

        if (!producto || !producto.activo) {
            return res.status(404).json({ error: 'Producto no encontrado' })
        }

        res.json(producto)
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener producto' })
    }
})

// POST /api/pedidos - Crear pedido
router.post('/pedidos', async (req, res) => {
    try {
        const { items, nombreCliente, apellidoCliente, telefonoCliente, emailCliente, dniCliente, direccionEnvio, ciudadEnvio, provinciaEnvio, codigoPostalEnvio, notas, usuarioId } = req.body

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'El pedido debe tener al menos un producto' })
        }

        // Calcular totales
        let subtotal = 0
        const itemsPedido = []

        for (const item of items) {
            const producto = await prisma.producto.findUnique({ where: { id: item.productoId } })
            if (!producto) {
                return res.status(400).json({ error: `Producto ${item.productoId} no encontrado` })
            }

            const precio = producto.precioOferta || producto.precio
            subtotal += precio * item.cantidad

            itemsPedido.push({
                productoId: producto.id,
                nombre: producto.nombre,
                precio,
                cantidad: item.cantidad,
                imagen: producto.imagenes[0] || null
            })
        }

        const envio = subtotal >= 50000 ? 0 : 5000 // Envío gratis +$50.000
        const total = subtotal + envio

        const pedido = await prisma.pedido.create({
            data: {
                usuarioId,
                nombreCliente,
                apellidoCliente,
                emailCliente,
                telefonoCliente,
                dniCliente,
                direccionEnvio,
                ciudadEnvio,
                provinciaEnvio,
                codigoPostalEnvio,
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
        })

        res.status(201).json(pedido)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al crear pedido' })
    }
})

export default router
