const jwt = require('jsonwebtoken')
const router = require('express').Router()

const { SECRET } = require('../util/config')
const { Patient, Provider } = require('../models')

const middleware = require('../util/middleware')

router.post('/patient/login', async (request, response) => {
  const body = request.body

  const patient = await Patient.findOne({
    where: {
      email: body.email
    }
  })

  const passwordCorrect = patient && body.password === patient.password_hash

  if (!passwordCorrect) {
    return response.status(401).json({
      error: 'invalid email or password'
    })
  }

  const tokenPayload = {
    id: patient.patient_id,
    email: patient.email,
    type: 'patient'
  }

  const token = jwt.sign(tokenPayload, SECRET)

  response
    .status(200)
    .send({ token, patient_id: patient.patient_id })
})

router.post('/provider/login', async (request, response) => {
  const body = request.body

  const provider = await Provider.findOne({
    where: {
      email: body.email
    }
  })

  const passwordCorrect = provider && body.password === provider.password_hash

  if (!passwordCorrect) {
    return response.status(401).json({
      error: 'invalid email or password'
    })
  }

  const tokenPayload = {
    id: provider.provider_id,
    email: provider.email,
    role: provider.role,
    type: 'provider'
  }

  const token = jwt.sign(tokenPayload, SECRET)

  response
    .status(200)
    .send({ token, provider_id: provider.provider_id, role: provider.role })
})

router.post('/logout', middleware.tokenExtractor, async (request, response) => {
  response
    .status(200)
    .send({ message: 'logged out successfully' })
})

module.exports = router