function parseCollegeEmail(email) {
  const match = email.match(/^(.+)\.(\d{2})([a-z]+)@kongu\.edu$/i);

  if (!match) {
    const local = String(email).split('@')[0] || '';
    const safeName = local.replace(/[._-]+/g, ' ').trim() || local;
    return { name: safeName, department: null, year: null };
  }

  const name = match[1];
  const joinYear = 2000 + parseInt(match[2]);
  const department = match[3].toUpperCase();

  const currentYear = new Date().getFullYear();
  const year = currentYear - joinYear + 1;

  return { name, department, year };
}

module.exports = parseCollegeEmail;
