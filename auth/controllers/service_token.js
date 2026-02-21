const jwt = require('jsonwebtoken')
const router = require('express').Router()
const { SECRET, SERVICE_API_KEY } = require('../util/config')

router.post('/service-token', async (request, response) => {
    const { service_name, api_key } = request.body

    if (!service_name || !api_key) {
        return response.status(400).json({
            error: 'service_name and api_key are required'
        })
    }

    if (api_key !== SERVICE_API_KEY) {
        return response.status(401).json({
            error: 'invalid api key'
        })
    }

    const validServices = ['hospital-api', 'auth-api']
    if (!validServices.includes(service_name)) {
        return response.status(400).json({
            error: `service_name must be one of: ${validServices.join(', ')}`
        })
    }

    const tokenPayload = {
        sub: service_name,
        iss: 'auth-service',
        aud: 'audit-service'
    }

    // Token expires in 15 minutes
    const token = jwt.sign(tokenPayload, SECRET, { expiresIn: '15m' })

    response.status(201).json({
        token,
        expires_in: 900
    })
})

module.exports = router
