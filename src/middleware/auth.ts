import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../index'

export interface AuthRequest extends Request {
    usuario?: {
        id: string
        email: string
        rol: string
    }
}

export const verificarToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string }

        const usuario = await prisma.usuario.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, rol: true }
        })

        if (!usuario) {
            return res.status(401).json({ error: 'Usuario no encontrado' })
        }

        req.usuario = usuario
        next()
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' })
    }
}

export const soloAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.usuario?.rol !== 'ADMIN') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' })
    }
    next()
}
