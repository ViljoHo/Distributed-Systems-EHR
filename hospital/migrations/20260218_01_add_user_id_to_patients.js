const { DataTypes } = require('sequelize')

module.exports = {
    up: async ({ context: queryInterface }) => {
        await queryInterface.addColumn('patients', 'user_id', {
            type: DataTypes.UUID,
            allowNull: true,
            unique: true
        })
    },
    down: async ({ context: queryInterface }) => {
        await queryInterface.removeColumn('patients', 'user_id')
    },
}
