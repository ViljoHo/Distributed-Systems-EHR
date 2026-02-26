const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const router = require('express').Router()

const { SECRET } = require('../util/config')
const { User } = require('../models')
const middleware = require('../util/middleware')
const { logAuditEvent } = require('../util/auditClient')

router.post('/register', async (request, response, next) => {
    try {
        const { email, password, ssn } = request.body

        if (!email || !password || !ssn) {
            return response.status(400).json({
                error: 'email, password, and ssn are required'
            })
        }

        const saltRounds = 10
        const passwordHash = await bcrypt.hash(password, saltRounds)

        const user = await User.create({
            email,
            password_hash: passwordHash,
            role: 'PATIENT',
            ssn
        })

        const tokenPayload = {
            user_id: user.user_id,
            email: user.email,
            role: user.role,
            ssn: user.ssn
        }

        const token = jwt.sign(tokenPayload, SECRET, { expiresIn: '30m' })

        logAuditEvent({
            actor_id: user.user_id,
            action: 'USER_REGISTER',
            resource_type: 'USER',
            resource_id: user.user_id,
            outcome: 'ALLOW',
            details: { email: user.email, role: user.role }
        })

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

router.post('/users', middleware.tokenExtractor, middleware.roleExtractor(['ADMIN']), async (request, response, next) => {
    try {
        const { email, password, role, ssn } = request.body

        if (!email || !password || !role || !ssn) {
            return response.status(400).json({
                error: 'email, password, role, and ssn are required'
            })
        }

        const validRoles = ['DOCTOR', 'NURSE', 'ADMIN']
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
            role,
            ssn
        })

        logAuditEvent({
            actor_id: request.decodedToken.user_id,
            action: 'USER_CREATE',
            resource_type: 'USER',
            resource_id: user.user_id,
            outcome: 'ALLOW',
            details: { email: user.email, role: user.role, created_by: request.decodedToken.email }
        })

        response.status(201).json({
            user_id: user.user_id,
            email: user.email,
            role: user.role
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
            logAuditEvent({
                actor_id: null,
                action: 'USER_LOGIN_FAILED',
                resource_type: 'USER',
                outcome: 'DENY',
                details: { email, reason: 'invalid email or password' }
            })
            return response.status(401).json({
                error: 'invalid email or password'
            })
        }

        if (!user.is_active) {
            logAuditEvent({
                actor_id: user.user_id,
                action: 'USER_LOGIN_FAILED',
                resource_type: 'USER',
                resource_id: user.user_id,
                outcome: 'DENY',
                details: { email, reason: 'account is deactivated' }
            })
            return response.status(403).json({
                error: 'account is deactivated'
            })
        }

        const tokenPayload = {
            user_id: user.user_id,
            email: user.email,
            role: user.role,
            ssn: user.ssn
        }

        const token = jwt.sign(tokenPayload, SECRET, { expiresIn: '30m' })

        logAuditEvent({
            actor_id: user.user_id,
            action: 'USER_LOGIN',
            resource_type: 'USER',
            resource_id: user.user_id,
            outcome: 'ALLOW',
            details: { email: user.email }
        })

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

        logAuditEvent({
            actor_id: user.user_id,
            action: 'USER_READ',
            resource_type: 'USER',
            resource_id: user.user_id,
            outcome: 'ALLOW'
        })

        response.json(user)
    } catch (error) {
        next(error)
    }
})

module.exports = router
