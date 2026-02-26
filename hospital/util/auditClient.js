const { SERVICE_NAME, SERVICE_NUMBER } = require('./config')
const redis = require('./redisClient')

const STREAM_KEY = 'audit_events'

const logAuditEvent = async (event) => {
    const payload = {
        occurred_at: new Date().toISOString(),
        source_service: SERVICE_NAME,
        source_node_id: `${SERVICE_NAME}_${SERVICE_NUMBER}`,
        ...event
    }

    try {
        await redis.xadd(STREAM_KEY, '*', 'data', JSON.stringify(payload))
    } catch (err) {
        console.error('Audit client: failed to publish to Redis stream:', err.message)
    }
}

module.exports = { logAuditEvent }
