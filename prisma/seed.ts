import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...')

    // Crear usuario Admin
    const adminPassword = await bcrypt.hash('admin123', 10)

    const admin = await prisma.usuario.upsert({
        where: { email: 'juliancancelo@gmail.com' },
        update: { rol: 'ADMIN' },
        create: {
            email: 'juliancancelo@gmail.com',
            password: adminPassword,
            nombre: 'Julian',
            apellido: 'Cancelo',
            rol: 'ADMIN',
            emailVerificado: true
        }
    })
    console.log('✅ Admin creado:', admin.email)

    // Crear configuración inicial
    const configs = [
        { clave: 'nombre_tienda', valor: 'Grana3D' },
        { clave: 'eslogan', valor: 'Productos Impresos en 3D' },
        { clave: 'email', valor: 'hola@grana3d.com.ar' },
        { clave: 'telefono', valor: '+54 11 1234-5678' },
        { clave: 'whatsapp', valor: '5491112345678' },
        { clave: 'instagram', valor: 'https://instagram.com/grana3d' },
        { clave: 'facebook', valor: 'https://facebook.com/grana3d' },
        { clave: 'direccion', valor: 'Buenos Aires, Argentina' },
        { clave: 'envio_gratis_minimo', valor: '50000' },
        { clave: 'costo_envio', valor: '5000' },
    ]

    for (const config of configs) {
        await prisma.configuracion.upsert({
            where: { clave: config.clave },
            update: { valor: config.valor },
            create: config
        })
    }
    console.log('✅ Configuración inicial creada')

    // Crear categorías
    const categorias = [
        { nombre: 'Figuras', slug: 'figuras', descripcion: 'Personajes y coleccionables', icono: 'Sparkles', color: 'from-purple-500 to-purple-600', orden: 1 },
        { nombre: 'Decoración', slug: 'decoracion', descripcion: 'Para tu hogar u oficina', icono: 'Home', color: 'from-cyan-500 to-cyan-600', orden: 2 },
        { nombre: 'Regalos', slug: 'regalos', descripcion: 'Personalizados y únicos', icono: 'Gift', color: 'from-orange-500 to-orange-600', orden: 3 },
        { nombre: 'Accesorios', slug: 'accesorios', descripcion: 'Llaveros, soportes y más', icono: 'Star', color: 'from-pink-500 to-pink-600', orden: 4 },
    ]

    for (const cat of categorias) {
        await prisma.categoria.upsert({
            where: { slug: cat.slug },
            update: cat,
            create: cat
        })
    }
    console.log('✅ Categorías creadas')

    console.log('🎉 Seed completado!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
