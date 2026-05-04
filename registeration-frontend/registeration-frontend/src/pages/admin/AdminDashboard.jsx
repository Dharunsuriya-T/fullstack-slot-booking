import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DRAFT_KEY = 'adminDraftProgress';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function AdminDashboard({ onEditForm }) {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      setError('');
      const res = await fetch(
        `${API_BASE}/admin/forms`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load forms');
        setForms([]);
      } else {
        setForms(data.forms || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load forms');
      setForms([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function publish(id) {
    setError('');
    const res = await fetch(
      `${API_BASE}/admin/forms/${id}/publish`,
      { method: 'POST', credentials: 'include' }
    );
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to publish');
      return;
    }
    load();
  }

  async function close(id) {
    setError('');
    const res = await fetch(
      `${API_BASE}/admin/forms/${id}/close`,
      { method: 'POST', credentials: 'include' }
    );
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to close');
      return;
    }
    load();
  }

  async function del(id) {
    if (!confirm('Delete draft form?')) return;

    setError('');
    const res = await fetch(
      `${API_BASE}/admin/forms/${id}`,
      { method: 'DELETE', credentials: 'include' }
    );
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to delete');
      return;
    }
    load();
  }

  async function handleLogout() {
    try {
      setError('');
      const res = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Logout failed');
        return;
      }
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Logout failed');
    }
  }

  if (loading) return <p className="p-8">Loading…</p>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between mb-6">
        <h1 className="text-3xl font-semibold">
          Admin Dashboard
        </h1>

        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin/create')}
            className="px-4 py-2 rounded bg-indigo-600 text-white"
          >
            + Create Form
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 border border-red-200 bg-red-50 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {forms.length === 0 ? (
        <p>No forms yet.</p>
      ) : (
        forms.map(f => (
          <div
            key={f.id}
            className="border rounded p-4 mb-4 bg-white hover:shadow cursor-pointer"
            onClick={() => {
              if (f.status === 'DRAFT') {
                localStorage.setItem(
                  DRAFT_KEY,
                  JSON.stringify({ formId: f.id })
                );
                { onEditForm(f.id); navigate('/admin/create'); }
              } else {
                navigate(`/admin/responses/${f.id}`);
              }
            }}
          >
            <h2 className="text-xl font-medium">{f.title}</h2>
            <p>Status: {f.status}</p>

            <div
              className="flex gap-3 mt-3"
              onClick={e => e.stopPropagation()} // ⛔ prevent card click
            >
              {f.status === 'DRAFT' && (
                <>
                  <button
                    onClick={() => publish(f.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded"
                  >
                    Publish
                  </button>
                  <button
                    onClick={() => del(f.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded"
                  >
                    Delete
                  </button>
                </>
              )}

              {f.status === 'OPEN' && (
                <button
                  onClick={() => close(f.id)}
                  className="px-3 py-1 bg-gray-800 text-white rounded"
                >
                  Close
                </button>
              )}

              {(f.status === 'OPEN' || f.status === 'CLOSED') && (
                <button
                  onClick={() => onOpenResponses(f.id)}
                  className="px-3 py-1 bg-indigo-600 text-white rounded"
                >
                  View responses
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
