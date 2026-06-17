const adminService = require('../services/admin.service');
const schedulerService = require('../services/scheduler.service');
const catchAsync = require('../utils/catchAsync');

/* ======================
   CREATE FORM (DRAFT)
====================== */
const createForm = catchAsync(async (req, res) => {
  const form = await adminService.createForm(req.body);
  res.json({ form });
});

/* ======================
   PUBLISH FORM
====================== */
const publishForm = catchAsync(async (req, res) => {
  const { mode, publish_at, close_at } = req.body || {};

  const form =
    String(mode || '').toUpperCase() === 'SCHEDULE'
      ? await adminService.schedulePublishForm({
          formId: req.params.formId,
          publishAt: publish_at,
          closeAt: close_at
        })
      : await adminService.publishForm(req.params.formId);

  // Clear the cache for this form so the status update is visible to students
  await schedulerService.clearFormCache(req.params.formId);
  res.json({ form });
});

/* ======================
   CLOSE FORM
====================== */
const closeForm = catchAsync(async (req, res) => {
  const form = await adminService.closeForm(req.params.formId);
  await schedulerService.clearFormCache(req.params.formId);
  res.json({ form });
});

/* ======================
   DELETE FORM (DRAFT)
====================== */
const deleteForm = catchAsync(async (req, res) => {
  await adminService.deleteForm(req.params.formId);
  await schedulerService.clearFormCache(req.params.formId);
  res.json({ message: 'Form deleted' });
});

/* ======================
   LIST FORMS (ADMIN)
====================== */
const listForms = catchAsync(async (req, res) => {
  const forms = await adminService.listFormsForAdmin();
  res.json({ forms });
});

/* ======================
   QUESTIONS / SLOTS / ELIGIBILITY
====================== */
const addQuestion = catchAsync(async (req, res) => {
  const question = await adminService.addQuestion(
    req.params.formId,
    req.body
  );
  await schedulerService.clearFormCache(req.params.formId);
  res.json({ question });
});

const addEligibilityRule = catchAsync(async (req, res) => {
  const rule = await adminService.addEligibilityRule(
    req.params.formId,
    req.body
  );
  await schedulerService.clearFormCache(req.params.formId);
  res.json({ rule });
});

const addSlot = catchAsync(async (req, res) => {
  const slot = await adminService.createSlot({
    form_id: req.params.formId,
    ...req.body
  });
  await schedulerService.clearFormCache(req.params.formId);
  res.json({ slot });
});

const getSlotAnalytics = catchAsync(async (req, res) => {
  const slots = await adminService.getSlotAnalytics(req.params.formId);
  res.json({ slots });
});

const deleteQuestion = catchAsync(async (req, res) => {
  await adminService.deleteQuestion(
    req.params.formId,
    req.params.questionId
  );
  await schedulerService.clearFormCache(req.params.formId);
  res.json({ message: 'Question deleted' });
});

const deleteSlot = catchAsync(async (req, res) => {
  await adminService.deleteSlot(
    req.params.formId,
    req.params.slotId
  );
  await schedulerService.clearFormCache(req.params.formId);
  res.json({ message: 'Slot deleted' });
});

module.exports = {
  createForm,
  publishForm,
  closeForm,
  deleteForm,
  listForms,
  addQuestion,
  addEligibilityRule,
  addSlot,
  getSlotAnalytics,
  deleteQuestion,
  deleteSlot
};
