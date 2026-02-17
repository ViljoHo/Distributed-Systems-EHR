const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const { Patient, Provider } = require('../models')
const { sequelize } = require('../util/db')
const helper = require('./test_helper')

describe('auth api', () => {
    beforeEach(async () => {
        await Patient.destroy({ where: {} })
        await Provider.destroy({ where: {} })
        await Provider.create(helper.initialProvider)
        await Patient.create(helper.initialPatient)
    })

    test('provider login with valid credentials', async () => {
        const response = await api
            .post('/api/v1/auth/provider/login')
            .send({ email: helper.initialProvider.email, password: helper.initialProvider.password_hash })
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.ok(response.body.token)
        assert.ok(response.body.provider_id)
        assert.strictEqual(response.body.role, 'DOCTOR')
    })

    test('provider login with invalid credentials', async () => {
        await api
            .post('/api/v1/auth/provider/login')
            .send({ email: helper.initialProvider.email, password: 'wrongpassword' })
            .expect(401)
    })

    test('patient login with valid credentials', async () => {
        const response = await api
            .post('/api/v1/auth/patient/login')
            .send({ email: helper.initialPatient.email, password: helper.initialPatient.password_hash })
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.ok(response.body.token)
        assert.ok(response.body.patient_id)
    })

    test('patient login with invalid credentials', async () => {
        await api
            .post('/api/v1/auth/patient/login')
            .send({ email: helper.initialPatient.email, password: 'wrong' })
            .expect(401)
    })

    test('logout with valid token', async () => {
        const loginRes = await api
            .post('/api/v1/auth/provider/login')
            .send({ email: helper.initialProvider.email, password: helper.initialProvider.password_hash })

        const response = await api
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${loginRes.body.token}`)
            .expect(200)

        assert.strictEqual(response.body.message, 'logged out successfully')
    })

    test('logout without token fails', async () => {
        await api
            .post('/api/v1/auth/logout')
            .expect(401)
    })
})

after(async () => {
    await sequelize.close()
})
