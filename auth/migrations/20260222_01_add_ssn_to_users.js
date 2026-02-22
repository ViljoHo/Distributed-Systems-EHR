const { DataTypes } = require('sequelize')

module.exports = {
    up: async ({ context: queryInterface }) => {
        await queryInterface.addColumn('users', 'ssn', {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        })
    },
    down: async ({ context: queryInterface }) => {
        await queryInterface.removeColumn('users', 'ssn')
    },
}
