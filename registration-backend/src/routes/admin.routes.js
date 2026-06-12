const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');
const validate = require('../middleware/validate');
const schemas = require('../validations/validation.schemas');
const catchAsync = require('../utils/catchAsync');
const { BadRequestError } = require('../utils/appError');

const adminController = require('../controllers/admin.controller');
const { getFormResponses } = require('../services/adminResponse.service');
const { exportFormResponsesCSV } = require('../services/csvExport.service');
const { sendTestLinkEmails } = require('../services/email.service');

/*
  🔒 ADMIN AUTH WALL
*/
router.use(requireAuth);
router.use(requireAdmin);

/* ======================
   ADMIN DASHBOARD
====================== */
router.get('/forms', adminController.listForms);

/* ======================
   FORM LIFECYCLE (NEW)
====================== */
router.post('/forms/:formId/publish', adminController.publishForm);
router.post('/forms/:formId/close', adminController.closeForm);
router.delete('/forms/:formId', adminController.deleteForm);

/* ======================
   FORM CREATION / EDITING
====================== */
router.post('/forms', validate(schemas.createForm), adminController.createForm);
router.post('/forms/:formId/questions', validate(schemas.addQuestion), adminController.addQuestion);
router.delete(
  '/forms/:formId/questions/:questionId',
  adminController.deleteQuestion
);
router.post('/forms/:formId/eligibility', adminController.addEligibilityRule);
router.post('/forms/:formId/slots', validate(schemas.addSlot), adminController.addSlot);
router.delete(
  '/forms/:formId/slots/:slotId',
  adminController.deleteSlot
);

/* ======================
   RESPONSES & EXPORT
====================== */
router.get('/forms/:formId/responses', catchAsync(async (req, res) => {
  const data = await getFormResponses(
    req.params.formId,
    req.query
  );
  res.json(data);
}));

router.get('/forms/:formId/export/csv', catchAsync(async (req, res) => {
  const csv = await exportFormResponsesCSV(req.params.formId);
  res.header('Content-Type', 'text/csv');
  res.attachment(`form-${req.params.formId}-responses.csv`);
  res.send(csv);
}));

/* ======================
   EMAIL AUTOMATION
====================== */
router.post('/forms/:formId/send-test-links', catchAsync(async (req, res) => {
  const { student_ids, subject, message } = req.body;

  if (!student_ids || !subject || !message) {
    throw new BadRequestError('Missing required fields');
  }

  await sendTestLinkEmails({
    formId: req.params.formId,
    studentIds: student_ids,
    subject,
    message
  });
  res.json({ message: 'Emails processed' });
}));

module.exports = router;
