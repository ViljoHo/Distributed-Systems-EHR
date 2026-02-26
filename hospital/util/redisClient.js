const Redis = require('ioredis')
const { REDIS_URL } = require('./config')

const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 200, 5000)
        return delay
    },
    lazyConnect: false
})

redis.on('error', (err) => {
    console.error('Redis connection error:', err.message)
})

redis.on('connect', () => {
    console.log('Redis connected')
})

module.exports = redis
