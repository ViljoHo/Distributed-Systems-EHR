const jwt = require('jsonwebtoken')
const { Patient, MedicalRecord } = require('../models')
const { SECRET } = require('../util/config')

const TEST_PROVIDER_ID = '99999999-9999-4999-9999-999999999999'
const TEST_ADMIN_ID = '88888888-8888-4888-8888-888888888888'

const initialPatient = {
    first_name: 'Test',
    last_name: 'Patient',
    date_of_birth: '1990-01-01',
    gender: 'MALE',
    phone: '1234567890',
    email: 'patient@test.com',
    ssn: '123456-7890',
    blood_type: 'A+'
}

const getProviderToken = (role) => {
    const tokenPayload = {
        user_id: role === 'ADMIN' ? TEST_ADMIN_ID : TEST_PROVIDER_ID,
        email: role === 'ADMIN' ? 'admin@test.com' : 'doctor@test.com',
        role: role,
        ssn: role === 'ADMIN' ? 'test-admin-ssn' : 'test-provider-ssn'
    }
    return `Bearer ${jwt.sign(tokenPayload, SECRET, { expiresIn: '30m' })}`
}

const getPatientToken = (patient) => {
    const tokenPayload = {
        user_id: 'test-patient-user-id',
        email: patient.email,
        role: 'PATIENT',
        ssn: patient.ssn || 'test-patient-ssn'
    }
    return `Bearer ${jwt.sign(tokenPayload, SECRET, { expiresIn: '30m' })}`
}

const patientsInDb = async () => {
    const patients = await Patient.findAll()
    return patients.map(p => p.toJSON())
}


const recordsInDb = async () => {
    const records = await MedicalRecord.findAll()
    return records.map(r => r.toJSON())
}

module.exports = {
    TEST_PROVIDER_ID,
    TEST_ADMIN_ID,
    initialPatient,
    getProviderToken,
    getPatientToken,
    patientsInDb,
    recordsInDb
}
