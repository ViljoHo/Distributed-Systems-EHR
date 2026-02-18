const app = require('./app')

const { PORT } = require('./util/config')
const { connectToDatabase } = require('./util/db')


const start = async () => {
    await connectToDatabase()
    app.listen(PORT, () => {
        console.log(`Auth server running on port ${PORT}`)
    })
}

start()
