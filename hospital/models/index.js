const Patient = require('./patient')
const Provider = require('./provider')
const MedicalRecord = require('./medical_record')

Patient.hasMany(MedicalRecord, { foreignKey: 'patient_id' })
MedicalRecord.belongsTo(Patient, { foreignKey: 'patient_id' })

Provider.hasMany(MedicalRecord, { foreignKey: 'provider_id' })
MedicalRecord.belongsTo(Provider, { foreignKey: 'provider_id' })

module.exports = {
  Patient, Provider, MedicalRecord
}