const jwt = require('jsonwebtoken')
const { Patient, Provider, MedicalRecord } = require('../models')
const { SECRET } = require('../util/config')

const initialProvider = {
    name: 'Dr. Test',
    role: 'DOCTOR',
    email: 'doctor@test.com'
}

const initialAdmin = {
    name: 'Admin User',
    role: 'ADMIN',
    email: 'admin@test.com'
}

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

const getProviderToken = (provider) => {
    const tokenPayload = {
        user_id: 'test-user-id',
        email: provider.email,
        role: provider.role,
        ssn: 'test-provider-ssn'
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

const providersInDb = async () => {
    const providers = await Provider.findAll()
    return providers.map(p => p.toJSON())
}

const recordsInDb = async () => {
    const records = await MedicalRecord.findAll()
    return records.map(r => r.toJSON())
}

module.exports = {
    initialProvider,
    initialAdmin,
    initialPatient,
    getProviderToken,
    getPatientToken,
    patientsInDb,
    providersInDb,
    recordsInDb
}
