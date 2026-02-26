const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const { User } = require('../models')
const { sequelize } = require('../util/db')
const helper = require('./test_helper')
const bcrypt = require('bcrypt')

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
        test('succeeds with valid data', async () => {
            const newUser = {
                email: 'new@user.com',
                password: 'secretpassword',
                role: 'PATIENT',
                ssn: '111111-1111'
            }

            const response = await api
                .post('/api/v1/auth/register')
                .send(newUser)
                .expect(201)
                .expect('Content-Type', /application\/json/)

            assert.ok(response.body.token)
            assert.strictEqual(response.body.email, newUser.email)
            assert.strictEqual(response.body.role, newUser.role)

            const usersAtEnd = await helper.usersInDb()
            assert.strictEqual(usersAtEnd.length, 1)
        })

        test('fails with missing email', async () => {
            const newUser = {
                password: 'secretpassword',
                role: 'PATIENT'
            }

            await api
                .post('/api/v1/auth/register')
                .send(newUser)
                .expect(400)
        })

        test('fails with invalid role', async () => {
            const newUser = {
                email: 'new@user.com',
                password: 'secretpassword',
                role: 'INVALID'
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
                role: 'PATIENT'
            }

            // Create first user
            await api
                .post('/api/v1/auth/register')
                .send({ ...newUser, ssn: '222222-2222' })
                .expect(201)

            // Try to create same user again
            await api
                .post('/api/v1/auth/register')
                .send({ ...newUser, ssn: '222222-2222' })
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
            // Create user
            const passwordHash = await bcrypt.hash(helper.initialUser.password, saltRounds)
            const user = await User.create({
                email: helper.initialUser.email,
                password_hash: passwordHash,
                role: helper.initialUser.role,
                ssn: '333333-3333'
            })

            // Login to get token
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
