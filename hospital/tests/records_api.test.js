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
let testPatient

describe('records api', () => {
    before(async () => {
        await connectToDatabase()
    })

    beforeEach(async () => {
        await MedicalRecord.destroy({ where: {} })
        await Patient.destroy({ where: {} })
        await Provider.destroy({ where: {} })

        const provider = await Provider.create(helper.initialProvider)
        const admin = await Provider.create(helper.initialAdmin)
        testPatient = await Patient.create(helper.initialPatient)

        providerToken = helper.getProviderToken(provider)
        adminToken = helper.getProviderToken(admin)
    })

    test('create a medical record', async () => {
        const newRecord = {
            diagnosis: 'Common cold',
            treatment: 'Rest and fluids',
            notes: 'Follow up in 1 week',
            visit_date: '2026-02-17'
        }

        const response = await api
            .post(`/api/v1/patients/${testPatient.patient_id}/records`)
            .set('Authorization', providerToken)
            .send(newRecord)
            .expect(201)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(response.body.diagnosis, 'Common cold')
        assert.strictEqual(response.body.patient_id, testPatient.patient_id)
    })

    test('list records for a patient', async () => {
        const provider = await Provider.findOne({ where: { email: helper.initialProvider.email } })

        await MedicalRecord.create({
            patient_id: testPatient.patient_id,
            provider_id: provider.provider_id,
            diagnosis: 'Test diagnosis',
            visit_date: '2026-02-17'
        })

        const response = await api
            .get(`/api/v1/patients/${testPatient.patient_id}/records`)
            .set('Authorization', providerToken)
            .expect(200)

        assert.strictEqual(response.body.length, 1)
    })

    test('get a single record', async () => {
        const provider = await Provider.findOne({ where: { email: helper.initialProvider.email } })

        const record = await MedicalRecord.create({
            patient_id: testPatient.patient_id,
            provider_id: provider.provider_id,
            diagnosis: 'Test diagnosis',
            visit_date: '2026-02-17'
        })

        const response = await api
            .get(`/api/v1/records/${record.record_id}`)
            .set('Authorization', providerToken)
            .expect(200)

        assert.strictEqual(response.body.diagnosis, 'Test diagnosis')
    })

    test('update a record (doctor only)', async () => {
        const provider = await Provider.findOne({ where: { email: helper.initialProvider.email } })

        const record = await MedicalRecord.create({
            patient_id: testPatient.patient_id,
            provider_id: provider.provider_id,
            diagnosis: 'Old diagnosis',
            visit_date: '2026-02-17'
        })

        const response = await api
            .put(`/api/v1/records/${record.record_id}`)
            .set('Authorization', providerToken)
            .send({ diagnosis: 'Updated diagnosis' })
            .expect(200)

        assert.strictEqual(response.body.diagnosis, 'Updated diagnosis')
    })

    test('delete record requires admin', async () => {
        const provider = await Provider.findOne({ where: { email: helper.initialProvider.email } })

        const record = await MedicalRecord.create({
            patient_id: testPatient.patient_id,
            provider_id: provider.provider_id,
            diagnosis: 'To delete',
            visit_date: '2026-02-17'
        })

        await api
            .delete(`/api/v1/records/${record.record_id}`)
            .set('Authorization', providerToken)
            .expect(403)

        await api
            .delete(`/api/v1/records/${record.record_id}`)
            .set('Authorization', adminToken)
            .expect(200)

        const records = await helper.recordsInDb()
        assert.strictEqual(records.length, 0)
    })
})

after(async () => {
    await sequelize.close()
})
