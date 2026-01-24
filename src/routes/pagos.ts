import { Router } from 'express'
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Inicializar MercadoPago con el access token
const mercadopago = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || ''
})

// POST /api/pagos/crear-preferencia - Crear pedido y preferencia de MercadoPago
router.post('/crear-preferencia', async (req, res) => {
    try {
        const {
            items,
            nombreCliente,
            apellidoCliente,
            telefonoCliente,
            emailCliente,
            dniCliente,
            direccionEnvio,
            ciudadEnvio,
            provinciaEnvio,
            codigoPostalEnvio,
            notas,
            usuarioId
        } = req.body

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Debe haber al menos un producto' })
        }

        // Calcular totales
        let subtotal = 0
        const itemsPedido = []
        const itemsMP = []

        for (const item of items) {
            const producto = await prisma.producto.findUnique({ where: { id: item.productoId } })
            if (!producto) {
                return res.status(400).json({ error: `Producto ${item.productoId} no encontrado` })
            }

            const precio = producto.precioOferta || producto.precio
            subtotal += precio * item.cantidad

            itemsPedido.push({
                productoId: producto.id,
                nombre: producto.nombre + (item.variante ? ` (${item.variante})` : ''),
                precio,
                cantidad: item.cantidad,
                imagen: producto.imagenes[0] || null
            })

            // Items para MercadoPago
            itemsMP.push({
                id: producto.id,
                title: producto.nombre + (item.variante ? ` - ${item.variante}` : ''),
                quantity: item.cantidad,
                unit_price: precio,
                currency_id: 'ARS',
                picture_url: producto.imagenes[0] || undefined
            })
        }

        const envio = subtotal >= 50000 ? 0 : 5000
        const total = subtotal + envio

        // Crear pedido en estado PENDIENTE_PAGO
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
                estado: 'PENDIENTE_PAGO',
                metodoPago: 'MERCADOPAGO',
                items: {
                    create: itemsPedido
                }
            },
            include: {
                items: true
            }
        })

        // Si hay costo de envío, agregarlo como item
        if (envio > 0) {
            itemsMP.push({
                id: 'envio',
                title: 'Costo de Envío',
                quantity: 1,
                unit_price: envio,
                currency_id: 'ARS'
            })
        }

        // Crear preferencia de MercadoPago
        const preference = new Preference(mercadopago)
        const frontendUrl = process.env.FRONTEND_URL || 'https://grana3d.com'

        const preferenceData = await preference.create({
            body: {
                items: itemsMP,
                payer: {
                    name: nombreCliente || '',
                    surname: apellidoCliente || '',
                    email: emailCliente || '',
                    phone: {
                        number: telefonoCliente || ''
                    },
                    identification: {
                        type: 'DNI',
                        number: dniCliente || ''
                    },
                    address: {
                        street_name: direccionEnvio || '',
                        zip_code: codigoPostalEnvio || ''
                    }
                },
                back_urls: {
                    success: `${frontendUrl}/checkout/exito?pedido=${pedido.id}`,
                    failure: `${frontendUrl}/checkout/fallido?pedido=${pedido.id}`,
                    pending: `${frontendUrl}/checkout/pendiente?pedido=${pedido.id}`
                },
                auto_return: 'approved',
                external_reference: pedido.id,
                notification_url: `${process.env.BACKEND_URL || 'https://api.grana3d.com'}/api/pagos/webhook`,
                statement_descriptor: 'GRANA3D'
            }
        })

        // Guardar el ID de la preferencia en el pedido
        await prisma.pedido.update({
            where: { id: pedido.id },
            data: { mercadopagoPreferenceId: preferenceData.id }
        })

        res.json({
            pedidoId: pedido.id,
            numeroPedido: pedido.numero,
            init_point: preferenceData.init_point,
            sandbox_init_point: preferenceData.sandbox_init_point
        })

    } catch (error) {
        console.error('Error creando preferencia:', error)
        res.status(500).json({ error: 'Error al procesar el pago' })
    }
})

// POST /api/pagos/webhook - Webhook de MercadoPago
router.post('/webhook', async (req, res) => {
    try {
        const { type, data } = req.body

        console.log('Webhook recibido:', type, data)

        if (type === 'payment') {
            const paymentId = data.id

            // Obtener información del pago
            const payment = new Payment(mercadopago)
            const paymentInfo = await payment.get({ id: paymentId })

            console.log('Estado del pago:', paymentInfo.status)

            if (paymentInfo.status === 'approved') {
                // Actualizar pedido a CONFIRMADO
                const pedidoId = paymentInfo.external_reference

                await prisma.pedido.update({
                    where: { id: pedidoId },
                    data: {
                        estado: 'CONFIRMADO',
                        mercadopagoPaymentId: String(paymentId)
                    }
                })

                console.log(`Pedido ${pedidoId} confirmado!`)
            } else if (paymentInfo.status === 'rejected' || paymentInfo.status === 'cancelled') {
                const pedidoId = paymentInfo.external_reference

                await prisma.pedido.update({
                    where: { id: pedidoId },
                    data: {
                        estado: 'CANCELADO',
                        mercadopagoPaymentId: String(paymentId)
                    }
                })
            }
        }

        res.sendStatus(200)
    } catch (error) {
        console.error('Error en webhook:', error)
        res.sendStatus(500)
    }
})

// GET /api/pagos/estado/:pedidoId - Consultar estado de un pedido
router.get('/estado/:pedidoId', async (req, res) => {
    try {
        const { pedidoId } = req.params

        const pedido = await prisma.pedido.findUnique({
            where: { id: pedidoId },
            select: {
                id: true,
                numero: true,
                estado: true,
                total: true,
                mercadopagoPaymentId: true
            }
        })

        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' })
        }

        res.json(pedido)
    } catch (error) {
        console.error('Error consultando pedido:', error)
        res.status(500).json({ error: 'Error al consultar pedido' })
    }
})

export default router
