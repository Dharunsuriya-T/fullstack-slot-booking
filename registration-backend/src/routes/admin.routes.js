const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

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
router.post('/forms', adminController.createForm);
router.post('/forms/:formId/questions', adminController.addQuestion);
router.delete(
  '/forms/:formId/questions/:questionId',
  adminController.deleteQuestion
);
router.post('/forms/:formId/eligibility', adminController.addEligibilityRule);
router.post('/forms/:formId/slots', adminController.addSlot);
router.delete(
  '/forms/:formId/slots/:slotId',
  adminController.deleteSlot
);

/* ======================
   RESPONSES & EXPORT
====================== */
router.get('/forms/:formId/responses', async (req, res) => {
  try {
    const data = await getFormResponses(
      req.params.formId,
      req.query
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/forms/:formId/export/csv', async (req, res) => {
  try {
    const csv = await exportFormResponsesCSV(req.params.formId);
    res.header('Content-Type', 'text/csv');
    res.attachment(`form-${req.params.formId}-responses.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   EMAIL AUTOMATION
====================== */
router.post('/forms/:formId/send-test-links', async (req, res) => {
  const { student_ids, subject, message } = req.body;

  if (!student_ids || !subject || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await sendTestLinkEmails({
      formId: req.params.formId,
      studentIds: student_ids,
      subject,
      message
    });
    res.json({ message: 'Emails processed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
