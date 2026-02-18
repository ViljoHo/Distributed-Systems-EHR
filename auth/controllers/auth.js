const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const router = require('express').Router()

const { SECRET } = require('../util/config')
const { User } = require('../models')
const middleware = require('../util/middleware')

router.post('/register', async (request, response, next) => {
    try {
        const { email, password, role } = request.body

        if (!email || !password || !role) {
            return response.status(400).json({
                error: 'email, password, and role are required'
            })
        }

        const validRoles = ['PATIENT', 'DOCTOR', 'NURSE', 'ADMIN']
        if (!validRoles.includes(role)) {
            return response.status(400).json({
                error: `role must be one of: ${validRoles.join(', ')}`
            })
        }

        const saltRounds = 10
        const passwordHash = await bcrypt.hash(password, saltRounds)

        const user = await User.create({
            email,
            password_hash: passwordHash,
            role
        })

        const tokenPayload = {
            user_id: user.user_id,
            email: user.email,
            role: user.role
        }

        const token = jwt.sign(tokenPayload, SECRET, { expiresIn: '30m' })

        response.status(201).json({
            user_id: user.user_id,
            email: user.email,
            role: user.role,
            token
        })
    } catch (error) {
        next(error)
    }
})

router.post('/login', async (request, response, next) => {
    try {
        const { email, password } = request.body

        if (!email || !password) {
            return response.status(400).json({
                error: 'email and password are required'
            })
        }

        const user = await User.findOne({
            where: { email }
        })

        const passwordCorrect = user && await bcrypt.compare(password, user.password_hash)

        if (!passwordCorrect) {
            return response.status(401).json({
                error: 'invalid email or password'
            })
        }

        if (!user.is_active) {
            return response.status(403).json({
                error: 'account is deactivated'
            })
        }

        const tokenPayload = {
            user_id: user.user_id,
            email: user.email,
            role: user.role
        }

        const token = jwt.sign(tokenPayload, SECRET, { expiresIn: '30m' })

        response.status(200).json({
            token,
            user_id: user.user_id,
            email: user.email,
            role: user.role
        })
    } catch (error) {
        next(error)
    }
})

router.get('/me', middleware.tokenExtractor, async (request, response, next) => {
    try {
        const user = await User.findByPk(request.decodedToken.user_id, {
            attributes: { exclude: ['password_hash'] }
        })

        if (!user) {
            return response.status(404).json({ error: 'user not found' })
        }

        response.json(user)
    } catch (error) {
        next(error)
    }
})

module.exports = router
