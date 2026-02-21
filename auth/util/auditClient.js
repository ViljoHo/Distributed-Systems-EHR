const {
    AUDIT_SERVICE_URL,
    AUTH_SERVICE_URL,
    SERVICE_API_KEY,
    SERVICE_NAME
} = require('./config')

let cachedToken = null
let cacheExpiresAt = 0

const getServiceToken = async () => {
    const now = Math.floor(Date.now() / 1000)

    if (cachedToken && cacheExpiresAt > now + 60) {
        return cachedToken
    }

    try {
        const response = await fetch(`${AUTH_SERVICE_URL}/api/v1/auth/service-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_name: SERVICE_NAME,
                api_key: SERVICE_API_KEY
            })
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch service token: ${response.statusText}`)
        }

        const data = await response.json()
        cachedToken = data.token
        cacheExpiresAt = now + (data.expires_in || 900)
        return cachedToken
    } catch (error) {
        console.error('Audit client: Error fetching service token:', error.message)
        return null
    }
}

const logAuditEvent = async (event) => {
    const token = await getServiceToken()
    if (!token) {
        console.error('Audit client: Skipping audit log due to missing service token')
        return
    }

    const payload = {
        occurred_at: new Date().toISOString(),
        source_service: SERVICE_NAME,
        source_node_id: `${SERVICE_NAME}_1`,
        ...event
    }

    fetch(`${AUDIT_SERVICE_URL}/internal/v1/audit/events/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    }).catch(error => {
        console.error('Audit client: Error sending audit event:', error.message)
    })
}

module.exports = { logAuditEvent }
