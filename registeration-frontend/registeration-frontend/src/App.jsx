import { useEffect, useState } from 'react';

import Login from './pages/login';
import StudentDashboard from './pages/StudentDashboard';
import StudentForm from './pages/StudentForm';

import AdminRoot from './pages/admin/adminRoot';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeFormId, setActiveFormId] = useState(null);

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch(
          'http://localhost:3000/auth/me',
          { credentials: 'include' }
        );

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } finally {
        setLoading(false);
      }
    }

    loadMe();
  }, []);

  if (loading) return <p>Loading…</p>;
  if (!user) return <Login />;

  /* ✅ ADMIN */
  if (user.role === 'admin') {
    return <AdminRoot />;
  }

  /* ✅ STUDENT */
  if (activeFormId) {
    return (
      <StudentForm
        formId={activeFormId}
        onBack={() => setActiveFormId(null)}
      />
    );
  }

  return (
    <StudentDashboard
      user={user}
      onOpenForm={setActiveFormId}
    />
  );
}

export default App;
