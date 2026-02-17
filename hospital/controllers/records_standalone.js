const router = require('express').Router()

const middleware = require('../util/middleware')
const { MedicalRecord, Patient, Provider } = require('../models')

const recordFinder = async (req, res, next) => {
    req.record = await MedicalRecord.findByPk(req.params.record_id, {
        include: [
            { model: Patient, attributes: ['patient_id', 'first_name', 'last_name'] },
            { model: Provider, attributes: ['provider_id', 'name', 'role'] }
        ]
    })
    next()
}

router.get('/:record_id', middleware.tokenExtractor, recordFinder, async (req, res) => {
    if (!req.record) {
        return res.status(404).end()
    }

    const token = req.decodedToken
    if (token.type === 'patient' && req.record.patient_id !== token.id) {
        return res.status(403).json({ error: 'access denied' })
    }

    res.json(req.record)
})

router.put('/:record_id', middleware.tokenExtractor, middleware.roleExtractor(['DOCTOR']), recordFinder, async (req, res) => {
    if (!req.record) {
        return res.status(404).end()
    }

    if (req.body.diagnosis !== undefined) req.record.diagnosis = req.body.diagnosis
    if (req.body.treatment !== undefined) req.record.treatment = req.body.treatment
    if (req.body.notes !== undefined) req.record.notes = req.body.notes
    if (req.body.visit_date !== undefined) req.record.visit_date = req.body.visit_date
    await req.record.save()
    res.json(req.record)
})

router.delete('/:record_id', middleware.tokenExtractor, middleware.roleExtractor(['ADMIN']), recordFinder, async (req, res) => {
    if (!req.record) {
        return res.status(404).end()
    }

    await req.record.destroy()
    res.json({ message: 'record deleted' })
})

module.exports = router
