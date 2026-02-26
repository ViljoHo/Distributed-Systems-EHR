require('dotenv').config()

module.exports = {
    DATABASE_URL: process.env.DATABASE_URL,
    READ_DATABASE_URL: process.env.READ_DATABASE_URL || process.env.DATABASE_URL,
    PORT: process.env.PORT || 3001,
    SECRET: process.env.SECRET,
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    SERVICE_NAME: process.env.SERVICE_NAME || 'hospital-api',
    SERVICE_NUMBER: process.env.SERVICE_NUMBER || '1',
}