function evaluateRule(actualValue, operator, expectedValue) {
  switch (operator) {
    case '>=':
      return Number(actualValue) >= Number(expectedValue);
    case '<=':
      return Number(actualValue) <= Number(expectedValue);
    case '=':
      return String(actualValue) === String(expectedValue);
    case 'IN':
      return expectedValue
        .split(',')
        .map(v => v.trim())
        .includes(String(actualValue));
    default:
      throw new Error('Invalid operator');
  }
}

async function checkStudentEligibility({
  client,
  formId,
  student
}) {
  const rulesResult = await client.query(
    `
    SELECT *
    FROM eligibility_rules
    WHERE form_id = $1
      AND source = 'STUDENT'
    `,
    [formId]
  );

  for (const rule of rulesResult.rows) {
    const actualValue = student[rule.student_field];

    const passed = evaluateRule(
      actualValue,
      rule.operator,
      rule.value
    );

    if (!passed) {
      throw new Error('You are not eligible for this form');
    }
  }
}

async function checkEligibility({
  client,
  formId,
  student,
  answersMap
}) {
  const rulesResult = await client.query(
    `SELECT * FROM eligibility_rules WHERE form_id = $1`,
    [formId]
  );

  for (const rule of rulesResult.rows) {
    let actualValue;

    if (rule.source === 'STUDENT') {
      actualValue = student[rule.student_field];
    }

    if (rule.source === 'ANSWER') {
      actualValue = answersMap[rule.question_id];
    }

    const passed = evaluateRule(
      actualValue,
      rule.operator,
      rule.value
    );

    if (!passed) {
      throw new Error(
        `Eligibility failed: ${rule.source} rule not satisfied`
      );
    }
  }
}

module.exports = { checkEligibility, checkStudentEligibility };
