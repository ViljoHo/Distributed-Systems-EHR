const { User } = require('../models')
const bcrypt = require('bcrypt')

const initialUser = {
    email: 'test@user.com',
    password: 'password123',
    role: 'PATIENT'
}

const initialAdmin = {
    email: 'admin@user.com',
    password: 'adminpassword',
    role: 'ADMIN'
}

const usersInDb = async () => {
    const users = await User.findAll()
    return users.map(u => u.toJSON())
}

module.exports = {
    initialUser,
    initialAdmin,
    usersInDb
}
