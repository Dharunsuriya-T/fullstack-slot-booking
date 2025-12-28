const pool = require('../db');
const { Parser } = require('json2csv');

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

async function exportFormResponsesCSV(formId) {
  const orderColumn = await getResponseOrderColumn();
  // 1. Get questions
  const questionsResult = await pool.query(
    `SELECT id, question_text
     FROM questions
     WHERE form_id = $1
     ORDER BY created_at`,
    [formId]
  );

  const questions = questionsResult.rows;

  // 2. Get responses
  const responsesResult = await pool.query(
    `
    SELECT
      r.id AS response_id,
      s.email,
      s.name,
      s.department,
      s.year
    FROM responses r
    JOIN students s ON s.id = r.student_id
    WHERE r.form_id = $1
    ORDER BY r.${orderColumn}
    `,
    [formId]
  );

  // 3. Get answers
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

  // 4. Map answers
  const answerMap = {};
  for (const row of answersResult.rows) {
    if (!answerMap[row.response_id]) {
      answerMap[row.response_id] = {};
    }
    answerMap[row.response_id][row.question_id] = row.answer;
  }

  // 5. Build rows
  const rows = responsesResult.rows.map(r => {
    const row = {
      email: r.email,
      name: r.name,
      department: r.department,
      year: r.year
    };

    for (const q of questions) {
      row[q.question_text] =
        answerMap[r.response_id]?.[q.id] || '';
    }

    return row;
  });

  // 6. Convert to CSV
  const fields = [
    'email',
    'name',
    'department',
    'year',
    ...questions.map(q => q.question_text)
  ];

  const parser = new Parser({ fields });
  return parser.parse(rows);
}

module.exports = { exportFormResponsesCSV };
