const pool = require('../db/pool');
const { checkEligibility } = require('./eligibility.service');

let formResponseColumnsSupport;

async function getFormResponseColumnsSupport(client) {
  if (formResponseColumnsSupport != null) {
    return formResponseColumnsSupport;
  }

  const result = await client.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'forms'
      AND column_name IN ('current_responses', 'max_responses')
    `
  );

  const cols = new Set(result.rows.map((r) => r.column_name));
  formResponseColumnsSupport =
    cols.has('current_responses') && cols.has('max_responses');
  return formResponseColumnsSupport;
}

async function submitForm({ formId, studentId, slotId, answers }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hasFormResponseColumns = await getFormResponseColumnsSupport(client);

    // 🔒 1. Lock form row
    const formResult = await client.query(
      `SELECT * FROM forms WHERE id = $1 FOR UPDATE`,
      [formId]
    );

    if (formResult.rows.length === 0) {
      throw new Error('Form not found');
    }

    const form = formResult.rows[0];

    if (form.status !== 'OPEN') {
      throw new Error('Sorry, the form has closed');
    }

    if (
      hasFormResponseColumns &&
      form.max_responses != null &&
      form.current_responses != null &&
      form.current_responses >= form.max_responses
    ) {
      await client.query(
        `UPDATE forms SET status = 'CLOSED' WHERE id = $1`,
        [formId]
      );
      throw new Error('Sorry, the form has closed');
    }

    // 🔒 2. Lock slot
    const slotResult = await client.query(
      `SELECT * FROM slots WHERE id = $1 FOR UPDATE`,
      [slotId]
    );

    if (slotResult.rows.length === 0) {
      throw new Error('Invalid slot');
    }

    const slot = slotResult.rows[0];

    if (slot.current_bookings >= slot.max_capacity) {
      throw new Error('Selected slot is full');
    }

    // 3. Fetch student
    const studentResult = await client.query(
      `SELECT * FROM students WHERE id = $1`,
      [studentId]
    );

    const student = studentResult.rows[0];

    // 4. Build answers map
    const answersMap = {};
    for (const ans of answers) {
      answersMap[ans.question_id] = ans.value;
    }

    // 5. Eligibility check (backend enforced)
    await checkEligibility({
      client,
      formId,
      student,
      answersMap
    });

    // 🔒 6. Insert response (duplicate prevented by DB)
    const responseResult = await client.query(
      `
      INSERT INTO responses (form_id, student_id, slot_id)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [formId, studentId, slotId]
    );

    const responseId = responseResult.rows[0].id;

    // 7. Insert answers
    for (const ans of answers) {
      await client.query(
        `
        INSERT INTO response_answers
          (response_id, question_id, answer)
        VALUES ($1, $2, $3)
        `,
        [responseId, ans.question_id, ans.value]
      );
    }

    // 🔒 8. Increment counters atomically (DB is the source of truth)
    // Guard against concurrent overbooking
    const slotUpdate = await client.query(
      `
      UPDATE slots
      SET current_bookings = current_bookings + 1
      WHERE id = $1
        AND current_bookings < max_capacity
      `,
      [slotId]
    );

    if (slotUpdate.rowCount === 0) {
      throw new Error('Selected slot is full');
    }

    if (hasFormResponseColumns) {
      const formUpdate = await client.query(
        `
        UPDATE forms
        SET current_responses = current_responses + 1
        WHERE id = $1
          AND (max_responses IS NULL OR current_responses < max_responses)
        `,
        [formId]
      );

      if (formUpdate.rowCount === 0) {
        await client.query(
          `UPDATE forms SET status = 'CLOSED' WHERE id = $1`,
          [formId]
        );
        throw new Error('Sorry, the form has closed');
      }
    }

    await client.query('COMMIT');
    return { success: true };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function withdrawForm({ formId, studentId }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hasFormResponseColumns = await getFormResponseColumnsSupport(client);

    const formResult = await client.query(
      `SELECT * FROM forms WHERE id = $1 FOR UPDATE`,
      [formId]
    );

    if (formResult.rows.length === 0) {
      throw new Error('Form not found');
    }

    const form = formResult.rows[0];

    if (form.status !== 'OPEN') {
      throw new Error('Cannot withdraw; form is not open');
    }

    const responseResult = await client.query(
      `
      SELECT id, slot_id
      FROM responses
      WHERE form_id = $1 AND student_id = $2
      FOR UPDATE
      `,
      [formId, studentId]
    );

    if (responseResult.rows.length === 0) {
      throw new Error('No submission to withdraw');
    }

    const response = responseResult.rows[0];

    await client.query(
      `DELETE FROM response_answers WHERE response_id = $1`,
      [response.id]
    );

    await client.query(
      `DELETE FROM responses WHERE id = $1`,
      [response.id]
    );

    await client.query(
      `
      UPDATE slots
      SET current_bookings = GREATEST(current_bookings - 1, 0)
      WHERE id = $1
      `,
      [response.slot_id]
    );

    if (hasFormResponseColumns) {
      await client.query(
        `
        UPDATE forms
        SET current_responses = GREATEST(current_responses - 1, 0)
        WHERE id = $1
        `,
        [formId]
      );
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { submitForm, withdrawForm };
