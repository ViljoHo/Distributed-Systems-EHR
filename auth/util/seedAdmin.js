const bcrypt = require('bcrypt')
const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SSN } = require('./config')
const { User } = require('../models')

const seedAdmin = async () => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_SSN) {
        console.log('Admin seed: ADMIN_EMAIL, ADMIN_PASSWORD, or ADMIN_SSN not set, skipping')
        return
    }

    const existing = await User.findOne({ where: { email: ADMIN_EMAIL } })
    if (existing) {
        console.log('Admin seed: admin user already exists, skipping')
        return
    }

    const saltRounds = 10
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, saltRounds)

    await User.create({
        email: ADMIN_EMAIL,
        password_hash: passwordHash,
        role: 'ADMIN',
        ssn: ADMIN_SSN
    })

    console.log(`Admin seed: admin user created (${ADMIN_EMAIL})`)
}

module.exports = { seedAdmin }
