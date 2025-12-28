const adminService = require('../services/admin.service');

/* ======================
   CREATE FORM (DRAFT)
====================== */
async function createForm(req, res) {
  try {
    const form = await adminService.createForm(req.body);
    res.json({ form });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/* ======================
   PUBLISH FORM
====================== */
async function publishForm(req, res) {
  try {
    const { mode, publish_at, close_at } = req.body || {};

    const form =
      String(mode || '').toUpperCase() === 'SCHEDULE'
        ? await adminService.schedulePublishForm({
            formId: req.params.formId,
            publishAt: publish_at,
            closeAt: close_at
          })
        : await adminService.publishForm(req.params.formId);
    res.json({ form });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}


/* ======================
   CLOSE FORM
====================== */
async function closeForm(req, res) {
  try {
    const form = await adminService.closeForm(req.params.formId);
    res.json({ form });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/* ======================
   DELETE FORM (DRAFT)
====================== */
async function deleteForm(req, res) {
  try {
    await adminService.deleteForm(req.params.formId);
    res.json({ message: 'Form deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/* ======================
   LIST FORMS (ADMIN)
====================== */
async function listForms(req, res) {
  try {
    const forms = await adminService.listFormsForAdmin();
    res.json({ forms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/* ======================
   QUESTIONS / SLOTS / ELIGIBILITY
====================== */
async function addQuestion(req, res) {
  try {
    const question = await adminService.addQuestion(
      req.params.formId,
      req.body
    );
    res.json({ question });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function addEligibilityRule(req, res) {
  try {
    const rule = await adminService.addEligibilityRule(
      req.params.formId,
      req.body
    );
    res.json({ rule });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function addSlot(req, res) {
  try {
    const slot = await adminService.createSlot({
      form_id: req.params.formId,
      ...req.body
    });
    res.json({ slot });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getSlotAnalytics(req, res) {
  try {
    const slots = await adminService.getSlotAnalytics(req.params.formId);
    res.json({ slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteQuestion(req, res) {
  try {
    await adminService.deleteQuestion(
      req.params.formId,
      req.params.questionId
    );
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function deleteSlot(req, res) {
  try {
    await adminService.deleteSlot(
      req.params.formId,
      req.params.slotId
    );
    res.json({ message: 'Slot deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

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
