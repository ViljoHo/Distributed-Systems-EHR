const { test, after, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const { Patient, MedicalRecord } = require('../models')
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

        providerToken = helper.getProviderToken('DOCTOR')
        adminToken = helper.getProviderToken('ADMIN')
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

    test('GET /me returns patient info with records for PATIENT role', async () => {
        const patient = await Patient.create(helper.initialPatient)

        await MedicalRecord.create({
            patient_id: patient.patient_id,
            provider_id: helper.TEST_PROVIDER_ID,
            diagnosis: 'Test diagnosis',
            visit_date: '2026-02-17'
        })

        const patientToken = helper.getPatientToken(patient)

        const response = await api
            .get('/api/v1/patients/me')
            .set('Authorization', patientToken)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(response.body.first_name, 'Test')
        assert.strictEqual(response.body.ssn, patient.ssn)
        assert.strictEqual(response.body.medical_records.length, 1)
        assert.strictEqual(response.body.medical_records[0].diagnosis, 'Test diagnosis')
    })

    test('GET /me returns 404 if no patient profile matches SSN', async () => {
        const fakePatient = { email: 'nobody@test.com', ssn: 'nonexistent-ssn' }
        const patientToken = helper.getPatientToken(fakePatient)

        await api
            .get('/api/v1/patients/me')
            .set('Authorization', patientToken)
            .expect(404)
    })

    test('GET /me returns 403 for non-patient roles', async () => {
        await api
            .get('/api/v1/patients/me')
            .set('Authorization', providerToken)
            .expect(403)
    })
})

after(async () => {
    await sequelize.close()
    await require('../util/redisClient').quit()
})
