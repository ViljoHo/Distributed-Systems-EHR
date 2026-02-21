require('dotenv').config()

module.exports = {
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT || 3001,
    SECRET: process.env.SECRET,
    SERVICE_API_KEY: process.env.SERVICE_API_KEY || 'shared-service-api-key',
    AUDIT_SERVICE_URL: process.env.AUDIT_SERVICE_URL || 'http://audit-service:5004',
    SERVICE_NAME: process.env.SERVICE_NAME || 'hospital-api',
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://auth:3001',
    SERVICE_NUMBER: process.env.SERVICE_NUMBER || '1',
}