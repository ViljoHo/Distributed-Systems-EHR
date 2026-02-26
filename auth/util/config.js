require('dotenv').config()

module.exports = {
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT || 3001,
    SECRET: process.env.SECRET,
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    SERVICE_NAME: process.env.SERVICE_NAME || 'auth-api',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_SSN: process.env.ADMIN_SSN,
}
