const pool = require('../db/pool');

async function getFormForStudent({ formId, student }) {
  // 1. Form
  const formResult = await pool.query(
    `
    SELECT id, title, description, test_date, status
    FROM forms
    WHERE id = $1
    `,
    [formId]
  );

  if (formResult.rows.length === 0) {
    throw new Error('Form not found');
  }

  // 2. Questions
  const questionsResult = await pool.query(
    `
    SELECT id, question_text, input_type, is_required
    FROM questions
    WHERE form_id = $1
    ORDER BY created_at
    `,
    [formId]
  );

  // 3. Eligibility rules (for display only)
  const rulesResult = await pool.query(
    `
    SELECT source, student_field, operator, value
    FROM eligibility_rules
    WHERE form_id = $1
    `,
    [formId]
  );

  // 4. Already submitted?
  const submittedResult = await pool.query(
    `
    SELECT 1 FROM responses
    WHERE form_id = $1 AND student_id = $2
    `,
    [formId, student.id]
  );

  return {
    form: formResult.rows[0],
    questions: questionsResult.rows,
    eligibility_rules: rulesResult.rows,
    already_submitted: submittedResult.rows.length > 0
  };
}

module.exports = { getFormForStudent };
