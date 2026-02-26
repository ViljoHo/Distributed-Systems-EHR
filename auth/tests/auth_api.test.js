const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const { User } = require('../models')
const { sequelize } = require('../util/db')
const helper = require('./test_helper')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { SECRET } = require('../util/config')

const getAdminToken = async () => {
    const saltRounds = 10
    const passwordHash = await bcrypt.hash('adminpassword', saltRounds)
    const admin = await User.create({
        email: 'admin@test.com',
        password_hash: passwordHash,
        role: 'ADMIN',
        ssn: '999999-9999'
    })
    return jwt.sign({
        user_id: admin.user_id,
        email: admin.email,
        role: admin.role,
        ssn: admin.ssn
    }, SECRET, { expiresIn: '30m' })
}

const getPatientToken = async () => {
    const saltRounds = 10
    const passwordHash = await bcrypt.hash('patientpassword', saltRounds)
    const patient = await User.create({
        email: 'patient@test.com',
        password_hash: passwordHash,
        role: 'PATIENT',
        ssn: '888888-8888'
    })
    return jwt.sign({
        user_id: patient.user_id,
        email: patient.email,
        role: patient.role,
        ssn: patient.ssn
    }, SECRET, { expiresIn: '30m' })
}

describe('auth api', () => {
    beforeEach(async () => {
        await User.destroy({ where: {} })
    })

    test('access root returns 404', async () => {
        await api
            .get('/')
            .expect(404)
    })

    describe('registration', () => {
        test('succeeds with valid data and role is always PATIENT', async () => {
            const newUser = {
                email: 'new@user.com',
                password: 'secretpassword',
                ssn: '111111-1111'
            }

            const response = await api
                .post('/api/v1/auth/register')
                .send(newUser)
                .expect(201)
                .expect('Content-Type', /application\/json/)

            assert.ok(response.body.token)
            assert.strictEqual(response.body.email, newUser.email)
            assert.strictEqual(response.body.role, 'PATIENT')

            const usersAtEnd = await helper.usersInDb()
            assert.strictEqual(usersAtEnd.length, 1)
        })

        test('role is PATIENT even if ADMIN is specified in body', async () => {
            const newUser = {
                email: 'sneaky@user.com',
                password: 'secretpassword',
                role: 'ADMIN',
                ssn: '111111-1111'
            }

            const response = await api
                .post('/api/v1/auth/register')
                .send(newUser)
                .expect(201)

            assert.strictEqual(response.body.role, 'PATIENT')
        })

        test('fails with missing email', async () => {
            const newUser = {
                password: 'secretpassword',
                ssn: '111111-1111'
            }

            await api
                .post('/api/v1/auth/register')
                .send(newUser)
                .expect(400)
        })

        test('fails with missing ssn', async () => {
            const newUser = {
                email: 'new@user.com',
                password: 'secretpassword'
            }

            await api
                .post('/api/v1/auth/register')
                .send(newUser)
                .expect(400)
        })

        test('fails if email already taken', async () => {
            const newUser = {
                email: 'taken@user.com',
                password: 'secretpassword',
                ssn: '222222-2222'
            }

            await api
                .post('/api/v1/auth/register')
                .send(newUser)
                .expect(201)

            await api
                .post('/api/v1/auth/register')
                .send({ ...newUser, ssn: '333333-3333' })
                .expect(400)
        })
    })

    describe('admin user creation (POST /users)', () => {
        test('succeeds with admin token and valid data', async () => {
            const adminToken = await getAdminToken()

            const newDoctor = {
                email: 'doctor@hospital.com',
                password: 'doctorpass',
                role: 'DOCTOR',
                ssn: '444444-4444'
            }

            const response = await api
                .post('/api/v1/auth/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newDoctor)
                .expect(201)
                .expect('Content-Type', /application\/json/)

            assert.strictEqual(response.body.email, newDoctor.email)
            assert.strictEqual(response.body.role, 'DOCTOR')
            assert.ok(!response.body.token)
        })

        test('can create NURSE and ADMIN users', async () => {
            const adminToken = await getAdminToken()

            const nurseRes = await api
                .post('/api/v1/auth/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ email: 'nurse@hospital.com', password: 'nursepass', role: 'NURSE', ssn: '555555-5555' })
                .expect(201)

            assert.strictEqual(nurseRes.body.role, 'NURSE')

            const adminRes = await api
                .post('/api/v1/auth/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ email: 'admin2@hospital.com', password: 'admin2pass', role: 'ADMIN', ssn: '666666-6666' })
                .expect(201)

            assert.strictEqual(adminRes.body.role, 'ADMIN')
        })

        test('rejects PATIENT role (patients must use /register)', async () => {
            const adminToken = await getAdminToken()

            await api
                .post('/api/v1/auth/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ email: 'patient2@hospital.com', password: 'pass', role: 'PATIENT', ssn: '777777-7777' })
                .expect(400)
        })

        test('fails without token', async () => {
            await api
                .post('/api/v1/auth/users')
                .send({ email: 'doctor@hospital.com', password: 'doctorpass', role: 'DOCTOR', ssn: '444444-4444' })
                .expect(401)
        })

        test('fails with patient token (not admin)', async () => {
            const patientToken = await getPatientToken()

            await api
                .post('/api/v1/auth/users')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({ email: 'doctor@hospital.com', password: 'doctorpass', role: 'DOCTOR', ssn: '444444-4444' })
                .expect(403)
        })

        test('fails with missing fields', async () => {
            const adminToken = await getAdminToken()

            await api
                .post('/api/v1/auth/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ email: 'doctor@hospital.com', password: 'doctorpass' })
                .expect(400)
        })
    })

    describe('login', () => {
        beforeEach(async () => {
            const saltRounds = 10
            const passwordHash = await bcrypt.hash(helper.initialUser.password, saltRounds)

            await User.create({
                email: helper.initialUser.email,
                password_hash: passwordHash,
                role: helper.initialUser.role,
                ssn: '333333-3333'
            })
        })

        test('succeeds with valid credentials', async () => {
            const response = await api
                .post('/api/v1/auth/login')
                .send({
                    email: helper.initialUser.email,
                    password: helper.initialUser.password
                })
                .expect(200)
                .expect('Content-Type', /application\/json/)

            assert.ok(response.body.token)
            assert.strictEqual(response.body.email, helper.initialUser.email)
        })

        test('fails with wrong password', async () => {
            await api
                .post('/api/v1/auth/login')
                .send({
                    email: helper.initialUser.email,
                    password: 'wrongpassword'
                })
                .expect(401)
        })

        test('fails with non-existent email', async () => {
            await api
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@user.com',
                    password: 'password'
                })
                .expect(401)
        })
    })

    describe('me endpoint', () => {
        let token

        beforeEach(async () => {
            const saltRounds = 10
            const passwordHash = await bcrypt.hash(helper.initialUser.password, saltRounds)
            const user = await User.create({
                email: helper.initialUser.email,
                password_hash: passwordHash,
                role: helper.initialUser.role,
                ssn: '333333-3333'
            })

            const loginRes = await api
                .post('/api/v1/auth/login')
                .send({
                    email: helper.initialUser.email,
                    password: helper.initialUser.password
                })
            token = loginRes.body.token
        })

        test('succeeds with valid token', async () => {
            const response = await api
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect('Content-Type', /application\/json/)

            assert.strictEqual(response.body.email, helper.initialUser.email)
            assert.strictEqual(response.body.password_hash, undefined)
        })

        test('fails without token', async () => {
            await api
                .get('/api/v1/auth/me')
                .expect(401)
        })

        test('fails with invalid token', async () => {
            await api
                .get('/api/v1/auth/me')
                .set('Authorization', 'Bearer invalidtoken')
                .expect(401)
        })
    })

})

after(async () => {
    await sequelize.close()
})
