const jwt = require('jsonwebtoken')
const { SECRET } = require('./config.js')

const tokenExtractor = (req, res, next) => {
    const authorization = req.get('authorization')
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        try {
            req.decodedToken = jwt.verify(authorization.substring(7), SECRET)
        } catch {
            return res.status(401).json({ error: 'token invalid' })
        }
    } else {
        return res.status(401).json({ error: 'token missing' })
    }
    next()
}

const roleExtractor = (allowedRoles) => {
    return (req, res, next) => {
        const token = req.decodedToken
        if (allowedRoles.includes(token.role)) {
            return next()
        }
        return res.status(403).json({ error: 'operation not permitted' })
    }
}

const errorHandler = (error, request, response, next) => {
    if (error.name === 'ValidationError') {
        return response.status(400).json({ error: error.message })
    } else if (error.name === 'SyntaxError' && error.status === 400 && 'body' in error) {
        return response.status(400).json({ error: 'Invalid JSON format' })
    } else if (error.name === 'SequelizeUniqueConstraintError') {
        return response.status(400).json({ error: 'email already registered' })
    } else if (error.name === 'JsonWebTokenError') {
        return response.status(400).json({ error: 'token missing or invalid' })
    } else if (error.name === 'TokenExpiredError') {
        return response.status(401).json({
            error: 'token expired'
        })
    }

    next(error)
}

module.exports = {
    errorHandler,
    tokenExtractor,
    roleExtractor
}
