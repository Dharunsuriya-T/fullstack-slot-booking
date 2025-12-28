const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const studentController = require('../controllers/student.controller');

router.use(requireAuth);

router.get('/forms', studentController.getForms);
router.get('/forms/:formId', studentController.getForm);
router.get('/forms/:formId/slots', studentController.getSlots);
router.post('/forms/:formId/submit', studentController.submitForm);
router.delete(
  '/forms/:formId/submit',
  studentController.withdrawForm
);

module.exports = router;
