import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AdminDashboard from './AdminDashboard';
import CreateFormWizard from './CreateFormWizard';
import FormResponses from './FormResponses';

export default function AdminRoot() {
  const [activeFormId, setActiveFormId] = useState(null);

  return (
    <Routes>
      <Route path="/" element={<AdminDashboard onEditForm={setActiveFormId} />} />
      <Route path="/create" element={<CreateFormWizard formId={activeFormId} />} />
      <Route path="/responses/:formId" element={<FormResponses />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
