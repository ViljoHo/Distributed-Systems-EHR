const Patient = require('./patient')
const MedicalRecord = require('./medical_record')

Patient.hasMany(MedicalRecord, { foreignKey: 'patient_id' })
MedicalRecord.belongsTo(Patient, { foreignKey: 'patient_id' })

module.exports = {
  Patient, MedicalRecord
}