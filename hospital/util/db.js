const Sequelize = require('sequelize')
const { DATABASE_URL, READ_DATABASE_URL } = require('./config')
const { Umzug, SequelizeStorage } = require('umzug')

let sequelize;

if (DATABASE_URL !== READ_DATABASE_URL) {
  const writeUrl = new URL(DATABASE_URL);
  const readUrl = new URL(READ_DATABASE_URL);

  sequelize = new Sequelize(writeUrl.pathname.slice(1), writeUrl.username, writeUrl.password, {
    dialect: "postgres",
    replication: {
      read: [
        { host: readUrl.hostname, port: readUrl.port || 5432, username: readUrl.username, password: readUrl.password }
      ],
      write: { host: writeUrl.hostname, port: writeUrl.port || 5432, username: writeUrl.username, password: writeUrl.password }
    }
  });
  console.log('Sequelize configured with Replication mode.');
} else {
  sequelize = new Sequelize(DATABASE_URL);
  console.log('Sequelize configured in Standard standalone mode.');
}

const connectToDatabase = async () => {
  try {
    await sequelize.authenticate()
    await runMigrations()
    console.log('database connected')
  } catch (err) {
    console.log('connecting database failed')
    return process.exit(1)
  }

  return null
}

const migrationConf = {
  migrations: {
    glob: 'migrations/*.js',
  },
  storage: new SequelizeStorage({ sequelize, tableName: 'migrations' }),
  context: sequelize.getQueryInterface(),
  logger: console,
}
const runMigrations = async () => {
  const migrator = new Umzug(migrationConf)
  const migrations = await migrator.up()
  console.log('Migrations up to date', {
    files: migrations.map((mig) => mig.name),
  })
}
const rollbackMigration = async () => {
  await sequelize.authenticate()
  const migrator = new Umzug(migrationConf)
  await migrator.down()
}
module.exports = { connectToDatabase, sequelize, rollbackMigration }