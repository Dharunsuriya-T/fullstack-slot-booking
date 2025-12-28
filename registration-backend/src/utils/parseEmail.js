function parseCollegeEmail(email) {
  const match = email.match(/^(.+)\.(\d{2})([a-z]+)@kongu\.edu$/i);

  if (!match) {
    throw new Error('Invalid college email format');
  }

  const name = match[1];
  const joinYear = 2000 + parseInt(match[2]);
  const department = match[3].toUpperCase();

  const currentYear = new Date().getFullYear();
  const year = currentYear - joinYear + 1;

  return { name, department, year };
}

module.exports = parseCollegeEmail;
