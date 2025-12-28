const sgMail = require('@sendgrid/mail');
const pool = require('../db');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendTestLinkEmails({
  formId,
  studentIds,
  subject,
  message
}) {
  for (const studentId of studentIds) {
    // 1. Prevent duplicate sends
    const alreadySent = await pool.query(
      `
      SELECT 1 FROM email_logs
      WHERE form_id = $1
        AND student_id = $2
        AND email_type = 'TEST_LINK'
      `,
      [formId, studentId]
    );

    if (alreadySent.rows.length > 0) continue;

    // 2. Fetch student email
    const studentResult = await pool.query(
      `SELECT email FROM students WHERE id = $1`,
      [studentId]
    );

    if (studentResult.rows.length === 0) continue;

    const email = studentResult.rows[0].email;

    try {
      // 3. Send email
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject,
        text: message
      });

      // 4. Log success
      await pool.query(
        `
        INSERT INTO email_logs (form_id, student_id, email_type, status)
        VALUES ($1, $2, 'TEST_LINK', 'SENT')
        `,
        [formId, studentId]
      );
    } catch (err) {
      // 5. Log failure
      await pool.query(
        `
        INSERT INTO email_logs (form_id, student_id, email_type, status)
        VALUES ($1, $2, 'TEST_LINK', 'FAILED')
        `,
        [formId, studentId]
      );
    }
  }
}

module.exports = { sendTestLinkEmails };
