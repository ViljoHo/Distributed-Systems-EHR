const express = require('express')
const app = express()

const loginRouter = require('./controllers/login')
const patientsRouter = require('./controllers/patients')
const patientRecordsRouter = require('./controllers/records')
const recordsRouter = require('./controllers/records_standalone')

const middleware = require('./util/middleware')

app.use(express.json())

app.use('/api/v1/auth', loginRouter)
app.use('/api/v1/patients', patientsRouter)
app.use('/api/v1/patients/:patient_id/records', patientRecordsRouter)
app.use('/api/v1/records', recordsRouter)

app.use(middleware.errorHandler)

module.exports = app