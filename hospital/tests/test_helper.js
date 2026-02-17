const { Patient, Provider, MedicalRecord } = require('../models')

const initialProvider = {
    name: 'Dr. Test',
    role: 'DOCTOR',
    email: 'doctor@test.com',
    password_hash: 'testpassword'
}

const initialAdmin = {
    name: 'Admin User',
    role: 'ADMIN',
    email: 'admin@test.com',
    password_hash: 'adminpassword'
}

const initialPatient = {
    first_name: 'Test',
    last_name: 'Patient',
    date_of_birth: '1990-01-01',
    gender: 'MALE',
    phone: '1234567890',
    email: 'patient@test.com',
    password_hash: 'patientpassword',
    blood_type: 'A+'
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
    patientsInDb,
    providersInDb,
    recordsInDb
}
