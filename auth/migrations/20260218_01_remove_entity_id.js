const { DataTypes } = require('sequelize')

module.exports = {
    up: async ({ context: queryInterface }) => {
        await queryInterface.removeColumn('users', 'entity_id')
    },
    down: async ({ context: queryInterface }) => {
        await queryInterface.addColumn('users', 'entity_id', {
            type: DataTypes.UUID,
            allowNull: true
        })
    },
}
