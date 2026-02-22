const { DataTypes } = require('sequelize')

module.exports = {
    up: async ({ context: queryInterface }) => {
        await queryInterface.addColumn('patients', 'ssn', {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        })
        await queryInterface.removeColumn('patients', 'user_id')
    },
    down: async ({ context: queryInterface }) => {
        await queryInterface.addColumn('patients', 'user_id', {
            type: DataTypes.UUID,
            allowNull: true,
            unique: true
        })
        await queryInterface.removeColumn('patients', 'ssn')
    },
}
