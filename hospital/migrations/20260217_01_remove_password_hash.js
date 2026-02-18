const { DataTypes } = require('sequelize')

module.exports = {
    up: async ({ context: queryInterface }) => {
        await queryInterface.removeColumn('patients', 'password_hash')
        await queryInterface.removeColumn('providers', 'password_hash')
    },
    down: async ({ context: queryInterface }) => {
        await queryInterface.addColumn('patients', 'password_hash', {
            type: DataTypes.STRING,
            allowNull: true
        })
        await queryInterface.addColumn('providers', 'password_hash', {
            type: DataTypes.STRING,
            allowNull: true
        })
    },
}
