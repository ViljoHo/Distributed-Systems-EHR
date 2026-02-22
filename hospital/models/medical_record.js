const { Model, DataTypes } = require('sequelize')

const { sequelize } = require('../util/db')

class MedicalRecord extends Model { }

MedicalRecord.init({
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
        allowNull: false
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
    }
}, {
    sequelize,
    underscored: true,
    timestamps: true,
    modelName: 'medical_record'
})

module.exports = MedicalRecord
