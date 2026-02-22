const router = require('express').Router()

const middleware = require('../util/middleware')
const { MedicalRecord, Patient, Provider } = require('../models')
const { logAuditEvent } = require('../util/auditClient')

const recordFinder = async (req, res, next) => {
    req.record = await MedicalRecord.findByPk(req.params.record_id, {
        include: [
            { model: Patient, attributes: ['patient_id', 'first_name', 'last_name', 'ssn'] },
            { model: Provider, attributes: ['provider_id', 'name', 'role'] }
        ]
    })
    next()
}

router.get(
    '/:record_id',
    middleware.tokenExtractor,
    middleware.roleExtractor(['DOCTOR', 'NURSE', 'ADMIN', 'PATIENT']),
    recordFinder,
    async (req, res) => {
    if (!req.record) {
        return res.status(404).end()
    }

    const token = req.decodedToken
    if (token.role === 'PATIENT' && (!req.record.patient || req.record.patient.ssn !== token.ssn)) {
        return res.status(403).json({ error: 'access denied' })
    }

    logAuditEvent({
        actor_id: token.user_id,
        action: 'RECORD_READ',
        resource_type: 'MEDICAL_RECORD',
        resource_id: req.record.record_id,
        patient_id: req.record.patient_id,
        outcome: 'ALLOW'
    })

    res.json(req.record)
})

router.put('/:record_id', middleware.tokenExtractor, middleware.roleExtractor(['DOCTOR', 'ADMIN']), recordFinder, async (req, res) => {
    if (!req.record) {
        return res.status(404).end()
    }

    if (req.body.diagnosis !== undefined) req.record.diagnosis = req.body.diagnosis
    if (req.body.treatment !== undefined) req.record.treatment = req.body.treatment
    if (req.body.notes !== undefined) req.record.notes = req.body.notes
    if (req.body.visit_date !== undefined) req.record.visit_date = req.body.visit_date

    const changedFields = Object.keys(req.body)
    await req.record.save()

    logAuditEvent({
        actor_id: req.decodedToken.user_id,
        action: 'RECORD_UPDATE',
        resource_type: 'MEDICAL_RECORD',
        resource_id: req.record.record_id,
        patient_id: req.record.patient_id,
        outcome: 'ALLOW',
        details: { changed_fields: changedFields }
    })

    res.json(req.record)
})

router.delete('/:record_id', middleware.tokenExtractor, middleware.roleExtractor(['ADMIN']), recordFinder, async (req, res) => {
    if (!req.record) {
        return res.status(404).end()
    }

    const recordId = req.record.record_id
    const patientId = req.record.patient_id
    await req.record.destroy()

    logAuditEvent({
        actor_id: req.decodedToken.user_id,
        action: 'RECORD_DELETE',
        resource_type: 'MEDICAL_RECORD',
        resource_id: recordId,
        patient_id: patientId,
        outcome: 'ALLOW'
    })

    res.json({ message: 'record deleted' })
})

module.exports = router
