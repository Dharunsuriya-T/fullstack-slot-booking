const pool = require('../db/pool');

let responseOrderColumn;

async function getResponseOrderColumn() {
  if (responseOrderColumn) return responseOrderColumn;

  const result = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'responses'
      AND column_name IN ('submitted_at', 'created_at')
    `
  );

  const cols = new Set(result.rows.map((r) => r.column_name));
  if (cols.has('submitted_at')) {
    responseOrderColumn = 'submitted_at';
  } else if (cols.has('created_at')) {
    responseOrderColumn = 'created_at';
  } else {
    responseOrderColumn = 'id';
  }

  return responseOrderColumn;
}

async function getFormResponses(formId, filters = {}) {
  const { slot_id, department, year } = filters;

  const orderColumn = await getResponseOrderColumn();

  const values = [formId];
  let idx = 2;
  let conditions = '';

  if (slot_id) {
    conditions += ` AND r.slot_id = $${idx++}`;
    values.push(slot_id);
  }

  if (department) {
    conditions += ` AND s.department = $${idx++}`;
    values.push(department);
  }

  if (year) {
    conditions += ` AND s.year = $${idx++}`;
    values.push(Number(year));
  }

  const questionsResult = await pool.query(
    `
    SELECT id, question_text
    FROM questions
    WHERE form_id = $1
    ORDER BY created_at
    `,
    [formId]
  );

  const responsesResult = await pool.query(
    `
    SELECT
      r.id AS response_id,
      s.id AS student_id,
      s.email,
      s.name,
      s.department,
      s.year,
      sl.slot_date,
      sl.start_time,
      sl.end_time
    FROM responses r
    JOIN students s ON s.id = r.student_id
    LEFT JOIN slots sl ON sl.id = r.slot_id
    WHERE r.form_id = $1
    ${conditions}
    ORDER BY r.${orderColumn}
    `,
    values
  );

  const answersResult = await pool.query(
    `
    SELECT
      ra.response_id,
      ra.question_id,
      ra.answer
    FROM response_answers ra
    JOIN responses r ON r.id = ra.response_id
    WHERE r.form_id = $1
    `,
    [formId]
  );

  const answerMap = {};
  for (const row of answersResult.rows) {
    if (!answerMap[row.response_id]) {
      answerMap[row.response_id] = {};
    }
    answerMap[row.response_id][row.question_id] = row.answer;
  }

  const rows = responsesResult.rows.map(r => ({
    student: {
      id: r.student_id,
      email: r.email,
      name: r.name,
      department: r.department,
      year: r.year
    },
    slot: r.slot_date
      ? {
          date: r.slot_date,
          start_time: r.start_time,
          end_time: r.end_time
        }
      : null,
    answers: answerMap[r.response_id] || {}
  }));

  return {
    questions: questionsResult.rows,
    rows
  };
}

module.exports = { getFormResponses };
