const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function getStudentForms() {
  const res = await fetch(`${API_BASE}/student/forms`, {
    credentials: 'include'
  });

  const data = await res.json();
  return data.forms;
}

export async function getFormDetails(formId) {
  const res = await fetch(
    `${API_BASE}/student/forms/${formId}`,
    { credentials: 'include' }
  );

  return res.json();
}

export async function getSlots(formId) {
  const res = await fetch(
    `${API_BASE}/student/forms/${formId}/slots`,
    { credentials: 'include' }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.slots;
}

export async function updateStudentProfile(payload) {
  const res = await fetch(`${API_BASE}/student/profile`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.user;
}

export async function submitForm(formId, payload) {
  const res = await fetch(
    `${API_BASE}/student/forms/${formId}/submit`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function logout() {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function withdrawSubmission(formId) {
  const res = await fetch(
    `${API_BASE}/student/forms/${formId}/submit`,
    {
      method: 'DELETE',
      credentials: 'include'
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}
