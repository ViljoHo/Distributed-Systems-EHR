const router = require('express').Router()
const { Op } = require('sequelize')

const middleware = require('../util/middleware')
const { Patient } = require('../models')

router.post('/', middleware.tokenExtractor, middleware.roleExtractor(['DOCTOR', 'NURSE', 'ADMIN']), async (req, res) => {
    try {
        const patient = await Patient.create({
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            date_of_birth: req.body.date_of_birth,
            gender: req.body.gender,
            phone: req.body.phone,
            email: req.body.email,
            password_hash: req.body.password,
            blood_type: req.body.blood_type
        })
        const patientJson = patient.toJSON()
        delete patientJson.password_hash
        res.status(201).json(patientJson)
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
        attributes: { exclude: ['password_hash'] },
        where,
        limit,
        offset
    })
    res.json(patients)
})

router.get('/:patient_id', middleware.tokenExtractor, middleware.selfOrRole('patient', 'patient_id', ['DOCTOR', 'NURSE', 'ADMIN']), async (req, res) => {
    const patient = await Patient.findByPk(req.params.patient_id, {
        attributes: { exclude: ['password_hash'] }
    })
    if (patient) {
        res.json(patient)
    } else {
        res.status(404).end()
    }
})

router.put('/:patient_id', middleware.tokenExtractor, middleware.selfOrRole('patient', 'patient_id', ['DOCTOR', 'ADMIN']), async (req, res) => {
    const patient = await Patient.findByPk(req.params.patient_id)

    if (patient) {
        if (req.body.first_name !== undefined) patient.first_name = req.body.first_name
        if (req.body.last_name !== undefined) patient.last_name = req.body.last_name
        if (req.body.phone !== undefined) patient.phone = req.body.phone
        if (req.body.email !== undefined) patient.email = req.body.email
        if (req.body.blood_type !== undefined) patient.blood_type = req.body.blood_type
        await patient.save()
        const patientJson = patient.toJSON()
        delete patientJson.password_hash
        res.json(patientJson)
    } else {
        res.status(404).end()
    }
})

router.delete('/:patient_id', middleware.tokenExtractor, middleware.roleExtractor(['ADMIN']), async (req, res) => {
    const patient = await Patient.findByPk(req.params.patient_id)
    if (patient) {
        await patient.destroy()
        res.json({ message: 'patient deleted' })
    } else {
        res.status(404).end()
    }
})

module.exports = router
