const express = require('express')
const app = express()

const authRouter = require('./controllers/auth')
const serviceTokenRouter = require('./controllers/service_token')

const middleware = require('./util/middleware')

app.use(express.json())

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/auth', serviceTokenRouter)

app.use(middleware.errorHandler)

module.exports = app
