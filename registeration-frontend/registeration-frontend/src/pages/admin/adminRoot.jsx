import { useState } from 'react';

import AdminDashboard from './AdminDashboard';
import CreateFormWizard from './CreateFormWizard';
import FormResponses from './FormResponses';

export default function AdminRoot() {
  const [page, setPage] = useState('dashboard');
  const [activeFormId, setActiveFormId] = useState(null);

  if (page === 'create') {
    return (
      <CreateFormWizard
        formId={activeFormId}
        onExit={() => {
          setActiveFormId(null);
          setPage('dashboard');
        }}
      />
    );
  }

  if (page === 'responses') {
    return (
      <FormResponses
        formId={activeFormId}
        onBack={() => setPage('dashboard')}
      />
    );
  }

  return (
    <AdminDashboard
      onCreateNew={() => {
        setActiveFormId(null);
        setPage('create');
      }}
      onResumeDraft={id => {
        setActiveFormId(id);
        setPage('create');
      }}
      onOpenResponses={id => {
        setActiveFormId(id);
        setPage('responses');
      }}
    />
  );
}
