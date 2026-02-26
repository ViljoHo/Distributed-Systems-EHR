const express = require('express')
const app = express()

const authRouter = require('./controllers/auth')

const middleware = require('./util/middleware')

app.use(express.json())

app.use('/api/v1/auth', authRouter)

app.use(middleware.errorHandler)

module.exports = app
