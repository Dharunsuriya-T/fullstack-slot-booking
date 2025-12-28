const pool = require('../db/pool');

/* ======================
   CREATE FORM (DRAFT)
====================== */
async function createForm(data) {
  const { title, description, test_date } = data;

  if (!title) {
    throw new Error('Title is required');
  }

  const result = await pool.query(
    `
    INSERT INTO forms
      (title, description, test_date, status)
    VALUES
      ($1, $2, $3, 'DRAFT')
    RETURNING *
    `,
    [title, description || null, test_date || null]
  );

  return result.rows[0];
}

async function schedulePublishForm({ formId, publishAt, closeAt }) {
  if (!publishAt) {
    throw new Error('publish_at is required for scheduling');
  }

  // datetime-local has no timezone. We treat admin input as IST.
  const publishAtIst = `${publishAt}:00+05:30`;
  const publishDate = new Date(publishAtIst);
  if (Number.isNaN(publishDate.valueOf())) {
    throw new Error('Invalid publish_at datetime');
  }

  let closeDate = null;
  let closeAtIst = null;
  if (closeAt) {
    closeAtIst = `${closeAt}:00+05:30`;
    closeDate = new Date(closeAtIst);
    if (Number.isNaN(closeDate.valueOf())) {
      throw new Error('Invalid close_at datetime');
    }
    if (closeDate <= publishDate) {
      throw new Error('close_at must be after publish_at');
    }
  }

  if (publishDate <= new Date()) {
    return publishForm(formId);
  }

  const result = await pool.query(
    `
    UPDATE forms
    SET
      scheduled_publish_at = ($2::timestamptz AT TIME ZONE 'UTC'),
      scheduled_close_at = ($3::timestamptz AT TIME ZONE 'UTC'),
      auto_open = false,
      auto_close = false
    WHERE id = $1 AND status = 'DRAFT'
    RETURNING *
    `,
    [formId, publishAtIst, closeAtIst]
  );

  if (result.rowCount === 0) {
    throw new Error('Form not in DRAFT state');
  }

  return result.rows[0];
}

async function deleteQuestion(formId, questionId) {
  const result = await pool.query(
    `
    DELETE FROM questions
    WHERE id = $1
      AND form_id = $2
      AND form_id IN (
        SELECT id FROM forms WHERE status = 'DRAFT'
      )
    `,
    [questionId, formId]
  );

  if (result.rowCount === 0) {
    throw new Error('Question not found or form is not in DRAFT');
  }
}

/* ======================
   DELETE SLOT (DRAFT FORMS)
====================== */
async function deleteSlot(formId, slotId) {
  const result = await pool.query(
    `
    DELETE FROM slots
    WHERE id = $1
      AND form_id = $2
      AND form_id IN (
        SELECT id FROM forms WHERE status = 'DRAFT'
      )
    `,
    [slotId, formId]
  );

  if (result.rowCount === 0) {
    throw new Error('Slot not found or form is not in DRAFT');
  }
}

/* ======================
   PUBLISH FORM
====================== */
async function publishForm(formId) {
  const result = await pool.query(
    `
    UPDATE forms
    SET status = 'OPEN'
    WHERE id = $1 AND status = 'DRAFT'
    RETURNING *
    `,
    [formId]
  );

  if (result.rowCount === 0) {
    throw new Error('Form not in DRAFT state');
  }

  return result.rows[0];
}

/* ======================
   CLOSE FORM
====================== */
async function closeForm(formId) {
  const result = await pool.query(
    `
    UPDATE forms
    SET status = 'CLOSED'
    WHERE id = $1 AND status = 'OPEN'
    RETURNING *
    `,
    [formId]
  );

  if (result.rowCount === 0) {
    throw new Error('Form not OPEN or already closed');
  }

  return result.rows[0];
}

/* ======================
   DELETE FORM (DRAFT ONLY)
====================== */
async function deleteForm(formId) {
  const result = await pool.query(
    `
    DELETE FROM forms
    WHERE id = $1 AND status = 'DRAFT'
    `,
    [formId]
  );

  if (result.rowCount === 0) {
    throw new Error('Only DRAFT forms can be deleted');
  }
}

/* ======================
   ADD QUESTION
====================== */
async function addQuestion(formId, data) {
  const { question_text, input_type, is_required } = data;

  if (!question_text || !input_type) {
    throw new Error('Invalid question data');
  }

  const result = await pool.query(
    `
    INSERT INTO questions
      (form_id, question_text, input_type, is_required)
    VALUES
      ($1, $2, $3, $4)
    RETURNING *
    `,
    [
      formId,
      question_text,
      input_type,
      is_required === false ? false : true
    ]
  );

  return result.rows[0];
}

/* ======================
   ADD ELIGIBILITY RULE
====================== */
async function addEligibilityRule(formId, data) {
  const {
    source,
    question_id,
    student_field,
    operator,
    value
  } = data;

  const result = await pool.query(
    `
    INSERT INTO eligibility_rules
      (form_id, source, question_id, student_field, operator, value)
    VALUES
      ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      formId,
      source,
      question_id || null,
      student_field || null,
      operator,
      value
    ]
  );

  return result.rows[0];
}

/* ======================
   ADD SLOT
====================== */
async function createSlot({
  form_id,
  slot_date,
  start_time,
  end_time,
  max_capacity
}) {
  if (!slot_date || !start_time || !end_time || !max_capacity) {
    throw new Error('Invalid slot data');
  }

  // Ensure form exists and is still in DRAFT before inserting a slot
  const formCheck = await pool.query(
    `
    SELECT id
    FROM forms
    WHERE id = $1
      AND status = 'DRAFT'
    `,
    [form_id]
  );

  if (formCheck.rowCount === 0) {
    throw new Error('Form not found or not in DRAFT');
  }

  const result = await pool.query(
    `
    INSERT INTO slots
      (form_id, slot_date, start_time, end_time, max_capacity)
    VALUES
      ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [form_id, slot_date, start_time, end_time, max_capacity]
  );

  return result.rows[0];
}

/* ======================
   LIST FORMS (ADMIN)
====================== */
async function listFormsForAdmin() {
  const result = await pool.query(
    `
    SELECT
      id,
      title,
      description,
      status,
      created_at
    FROM forms
    ORDER BY created_at DESC
    `
  );

  return result.rows;
}

/* ======================
   SLOT ANALYTICS
====================== */
async function getSlotAnalytics(formId) {
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

  return result.rows;
}

module.exports = {
  createForm,
  publishForm,
  schedulePublishForm,
  closeForm,
  deleteForm,
  addQuestion,
  deleteQuestion,
  addEligibilityRule,
  createSlot,
  deleteSlot,
  listFormsForAdmin,
  getSlotAnalytics
};
