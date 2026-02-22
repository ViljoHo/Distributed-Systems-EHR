const { test, after, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const { Patient, Provider, MedicalRecord } = require('../models')
const { sequelize, connectToDatabase } = require('../util/db')
const helper = require('./test_helper')

let providerToken
let adminToken

describe('patients api', () => {
    before(async () => {
        await connectToDatabase()
    })

    beforeEach(async () => {
        await MedicalRecord.destroy({ where: {} })
        await Patient.destroy({ where: {} })
        await Provider.destroy({ where: {} })

        const provider = await Provider.create(helper.initialProvider)
        const admin = await Provider.create(helper.initialAdmin)

        providerToken = helper.getProviderToken(provider)
        adminToken = helper.getProviderToken(admin)
    })

    test('create a new patient', async () => {
        const newPatient = {
            first_name: 'Jane',
            last_name: 'Doe',
            date_of_birth: '1985-05-15',
            gender: 'FEMALE',
            phone: '0501234567',
            email: 'jane@test.com',
            ssn: '150585-789X',
            blood_type: 'O+'
        }

        const response = await api
            .post('/api/v1/patients')
            .set('Authorization', providerToken)
            .send(newPatient)
            .expect(201)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(response.body.first_name, 'Jane')
        assert.strictEqual(response.body.last_name, 'Doe')
    })

    test('create patient without token fails', async () => {
        const newPatient = {
            first_name: 'Jane',
            last_name: 'Doe',
            date_of_birth: '1985-05-15',
            gender: 'FEMALE',
            email: 'jane@test.com'
        }

        await api
            .post('/api/v1/patients')
            .send(newPatient)
            .expect(401)
    })

    test('list patients', async () => {
        await Patient.create(helper.initialPatient)

        const response = await api
            .get('/api/v1/patients')
            .set('Authorization', providerToken)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(response.body.length, 1)
    })

    test('get patient by id', async () => {
        const patient = await Patient.create(helper.initialPatient)

        const response = await api
            .get(`/api/v1/patients/${patient.patient_id}`)
            .set('Authorization', providerToken)
            .expect(200)

        assert.strictEqual(response.body.first_name, 'Test')
    })

    test('update patient', async () => {
        const patient = await Patient.create(helper.initialPatient)

        const response = await api
            .put(`/api/v1/patients/${patient.patient_id}`)
            .set('Authorization', providerToken)
            .send({ first_name: 'Updated' })
            .expect(200)

        assert.strictEqual(response.body.first_name, 'Updated')
    })

    test('delete patient requires admin', async () => {
        const patient = await Patient.create(helper.initialPatient)

        await api
            .delete(`/api/v1/patients/${patient.patient_id}`)
            .set('Authorization', providerToken)
            .expect(403)

        await api
            .delete(`/api/v1/patients/${patient.patient_id}`)
            .set('Authorization', adminToken)
            .expect(200)

        const patientsAtEnd = await helper.patientsInDb()
        assert.strictEqual(patientsAtEnd.length, 0)
    })
})

after(async () => {
    await sequelize.close()
})
