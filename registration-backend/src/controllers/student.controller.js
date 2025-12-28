const pool = require('../db/pool');
const submissionService = require('../services/submission.service');

async function getForms(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        f.id,
        f.title,
        f.test_date,
        EXISTS (
          SELECT 1
          FROM responses r
          WHERE r.form_id = f.id
            AND r.student_id = $1
        ) AS already_submitted
      FROM forms f
      WHERE f.status = 'OPEN'
      ORDER BY f.created_at DESC
      `,
      [req.user.id]
    );

    res.json({ forms: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getForm(req, res) {
  const { formId } = req.params;

  try {
    const formResult = await pool.query(
      `
      SELECT id, title, description, test_date, status
      FROM forms
      WHERE id = $1
      `,
      [formId]
    );

    if (formResult.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const questionsResult = await pool.query(
      `
      SELECT id, question_text, input_type, is_required
      FROM questions
      WHERE form_id = $1
      ORDER BY created_at
      `,
      [formId]
    );

    const rulesResult = await pool.query(
      `
      SELECT source, question_id, student_field, operator, value
      FROM eligibility_rules
      WHERE form_id = $1
      `,
      [formId]
    );

    const submittedResult = await pool.query(
      `
      SELECT 1
      FROM responses
      WHERE form_id = $1
        AND student_id = $2
      `,
      [formId, req.user.id]
    );

    res.json({
      form: formResult.rows[0],
      questions: questionsResult.rows,
      eligibility_rules: rulesResult.rows,
      already_submitted: submittedResult.rows.length > 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getSlots(req, res) {
  const { formId } = req.params;

  const result = await pool.query(
    `
    SELECT
      id,
      slot_date,
      start_time,
      end_time,
      max_capacity,
      current_bookings,
      (max_capacity - current_bookings) AS remaining
    FROM slots
    WHERE form_id = $1
    ORDER BY slot_date, start_time
    `,
    [formId]
  );

  res.json({ slots: result.rows });
}

async function submitForm(req, res) {
  try {
    await submissionService.submitForm({
      formId: req.params.formId,
      studentId: req.user.id,
      slotId: req.body.slot_id,
      answers: req.body.answers
    });

    res.json({ message: 'Submission successful' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function withdrawForm(req, res) {
  try {
    await submissionService.withdrawForm({
      formId: req.params.formId,
      studentId: req.user.id
    });

    res.json({ message: 'Submission withdrawn' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  getForms,
  getForm,
  getSlots,
  submitForm,
  withdrawForm
};
