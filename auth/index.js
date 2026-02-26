const app = require('./app')

const { PORT } = require('./util/config')
const { connectToDatabase } = require('./util/db')
const { seedAdmin } = require('./util/seedAdmin')


const start = async () => {
    await connectToDatabase()
    await seedAdmin()
    app.listen(PORT, () => {
        console.log(`Auth server running on port ${PORT}`)
    })
}

start()
