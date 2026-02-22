const router = require('express').Router()
const { Op } = require('sequelize')

const middleware = require('../util/middleware')
const { Patient } = require('../models')
const { logAuditEvent } = require('../util/auditClient')

router.post('/', middleware.tokenExtractor, middleware.roleExtractor(['DOCTOR', 'NURSE', 'ADMIN']), async (req, res) => {
    try {
        const patient = await Patient.create({
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            date_of_birth: req.body.date_of_birth,
            gender: req.body.gender,
            phone: req.body.phone,
            email: req.body.email,
            ssn: req.body.ssn,
            blood_type: req.body.blood_type
        })

        logAuditEvent({
            actor_id: req.decodedToken.user_id,
            action: 'PATIENT_CREATE',
            resource_type: 'PATIENT',
            resource_id: patient.patient_id,
            patient_id: patient.patient_id,
            outcome: 'ALLOW'
        })

        res.status(201).json(patient)
    } catch (error) {
        return res.status(400).json({ error: error.message })
    }
})

router.get('/', middleware.tokenExtractor, middleware.roleExtractor(['DOCTOR', 'NURSE', 'ADMIN']), async (req, res) => {
    const where = {}

    if (req.query.search) {
        where[Op.or] = [
            { first_name: { [Op.iLike]: `%${req.query.search}%` } },
            { last_name: { [Op.iLike]: `%${req.query.search}%` } }
        ]
    }

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit

    const patients = await Patient.findAll({
        where,
        limit,
        offset
    })

    logAuditEvent({
        actor_id: req.decodedToken.user_id,
        action: 'PATIENT_LIST',
        resource_type: 'PATIENT',
        outcome: 'ALLOW',
        details: { search: req.query.search, page, limit }
    })

    res.json(patients)
})

router.get('/:patient_id', middleware.tokenExtractor, middleware.selfOrRole('patient_id', ['DOCTOR', 'NURSE', 'ADMIN']), async (req, res) => {
    const patient = await Patient.findByPk(req.params.patient_id)
    if (patient) {
        logAuditEvent({
            actor_id: req.decodedToken.user_id,
            action: 'PATIENT_READ',
            resource_type: 'PATIENT',
            resource_id: patient.patient_id,
            patient_id: patient.patient_id,
            outcome: 'ALLOW'
        })
        res.json(patient)
    } else {
        res.status(404).end()
    }
})

router.put('/:patient_id', middleware.tokenExtractor, middleware.selfOrRole('patient_id', ['DOCTOR', 'ADMIN']), async (req, res) => {
    const patient = await Patient.findByPk(req.params.patient_id)

    if (patient) {
        if (req.body.first_name !== undefined) patient.first_name = req.body.first_name
        if (req.body.last_name !== undefined) patient.last_name = req.body.last_name
        if (req.body.phone !== undefined) patient.phone = req.body.phone
        if (req.body.email !== undefined) patient.email = req.body.email
        if (req.body.blood_type !== undefined) patient.blood_type = req.body.blood_type

        const changedFields = Object.keys(req.body)
        await patient.save()

        logAuditEvent({
            actor_id: req.decodedToken.user_id,
            action: 'PATIENT_UPDATE',
            resource_type: 'PATIENT',
            resource_id: patient.patient_id,
            patient_id: patient.patient_id,
            outcome: 'ALLOW',
            details: { changed_fields: changedFields }
        })

        res.json(patient)
    } else {
        res.status(404).end()
    }
})

router.delete('/:patient_id', middleware.tokenExtractor, middleware.roleExtractor(['ADMIN']), async (req, res) => {
    const patient = await Patient.findByPk(req.params.patient_id)
    if (patient) {
        const patientId = patient.patient_id
        await patient.destroy()

        logAuditEvent({
            actor_id: req.decodedToken.user_id,
            action: 'PATIENT_DELETE',
            resource_type: 'PATIENT',
            resource_id: patientId,
            patient_id: patientId,
            outcome: 'ALLOW'
        })

        res.json({ message: 'patient deleted' })
    } else {
        res.status(404).end()
    }
})

module.exports = router
