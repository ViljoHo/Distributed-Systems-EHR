const { DataTypes } = require('sequelize')

module.exports = {
    up: async ({ context: queryInterface }) => {
        await queryInterface.removeConstraint('medical_records', 'medical_records_provider_id_fkey').catch(err => {
            console.log('Constraint not found or already removed:', err.message)
        })

        
        await queryInterface.dropTable('providers')
    },
    down: async ({ context: queryInterface }) => {
        
        await queryInterface.createTable('providers', {
            provider_id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            role: {
                type: DataTypes.ENUM('DOCTOR', 'NURSE', 'ADMIN'),
                allowNull: false
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            password_hash: {
                type: DataTypes.STRING,
                allowNull: false
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            }
        })

        await queryInterface.addConstraint('medical_records', {
            fields: ['provider_id'],
            type: 'foreign key',
            name: 'medical_records_provider_id_fkey',
            references: {
                table: 'providers',
                field: 'provider_id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        })
    }
}
