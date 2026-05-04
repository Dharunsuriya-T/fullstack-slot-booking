import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

const Login = lazy(() => import('./pages/Login'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const StudentForm = lazy(() => import('./pages/StudentForm'));
const AdminRoot = lazy(() => import('./pages/admin/adminRoot'));

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch(
          `${API_BASE}/auth/me`,
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

  return (
    <Router>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-gray-500">Loading…</p>
          </div>
        }
      >
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={user ? (user.role === 'admin' ? <AdminRoot /> : <StudentDashboard user={user} />) : <Navigate to="/login" />} />
          <Route path="/form/:formId" element={user ? <StudentForm /> : <Navigate to="/login" />} />
          <Route path="/admin/*" element={user && user.role === 'admin' ? <AdminRoot /> : <Navigate to="/" />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
