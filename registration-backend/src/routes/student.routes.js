const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const studentController = require('../controllers/student.controller');
const validate = require('../middleware/validate');
const schemas = require('../validations/validation.schemas');

router.use(requireAuth);

router.get('/forms', studentController.getForms);
router.get('/forms/:formId', studentController.getForm);
router.get('/forms/:formId/slots', studentController.getSlots);
router.put('/profile', validate(schemas.updateProfile), studentController.updateProfile);
router.post('/forms/:formId/submit', studentController.submitForm);
router.delete(
  '/forms/:formId/submit',
  studentController.withdrawForm
);

module.exports = router;
