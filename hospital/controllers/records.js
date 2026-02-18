const router = require('express').Router({ mergeParams: true })

const middleware = require('../util/middleware')
const { MedicalRecord, Patient, Provider } = require('../models')

router.post('/', middleware.tokenExtractor, middleware.roleExtractor(['DOCTOR', 'NURSE']), async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.patient_id)
        if (!patient) {
            return res.status(404).json({ error: 'patient not found' })
        }

        const provider = await Provider.findOne({ where: { email: req.decodedToken.email } })
        if (!provider) {
            return res.status(400).json({ error: 'provider profile not found' })
        }

        const record = await MedicalRecord.create({
            patient_id: req.params.patient_id,
            provider_id: provider.provider_id,
            diagnosis: req.body.diagnosis,
            treatment: req.body.treatment,
            notes: req.body.notes,
            visit_date: req.body.visit_date
        })
        res.status(201).json(record)
    } catch (error) {
        return res.status(400).json({ error: error.message })
    }
})

router.get('/', middleware.tokenExtractor, middleware.selfOrRole('patient_id', ['DOCTOR', 'NURSE', 'ADMIN']), async (req, res) => {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit

    const records = await MedicalRecord.findAll({
        where: { patient_id: req.params.patient_id },
        include: [
            { model: Provider, attributes: ['name', 'role'] }
        ],
        limit,
        offset
    })
    res.json(records)
})

module.exports = router
