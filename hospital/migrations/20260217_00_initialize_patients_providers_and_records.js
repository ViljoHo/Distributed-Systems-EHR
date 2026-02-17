const { DataTypes } = require('sequelize')

module.exports = {
    up: async ({ context: queryInterface }) => {
        await queryInterface.createTable('patients', {
            patient_id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            first_name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            last_name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            date_of_birth: {
                type: DataTypes.DATEONLY,
                allowNull: false
            },
            gender: {
                type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER'),
                allowNull: false
            },
            phone: {
                type: DataTypes.STRING,
                allowNull: true
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
            blood_type: {
                type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
                allowNull: true
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
        await queryInterface.createTable('medical_records', {
            record_id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            patient_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: { model: 'patients', key: 'patient_id' }
            },
            provider_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: { model: 'providers', key: 'provider_id' }
            },
            diagnosis: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            treatment: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            visit_date: {
                type: DataTypes.DATEONLY,
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
    },
    down: async ({ context: queryInterface }) => {
        await queryInterface.dropTable('medical_records')
        await queryInterface.dropTable('providers')
        await queryInterface.dropTable('patients')
    },
}
