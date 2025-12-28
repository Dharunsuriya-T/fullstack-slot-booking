import { useEffect, useState } from 'react';

const DRAFT_KEY = 'adminDraftProgress';

export default function AdminDashboard({
  onCreateNew,
  onResumeDraft,
  onOpenResponses
}) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch(
      'http://localhost:3000/admin/forms',
      { credentials: 'include' }
    );
    const data = await res.json();
    setForms(data.forms || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function publish(id) {
    await fetch(
      `http://localhost:3000/admin/forms/${id}/publish`,
      { method: 'POST', credentials: 'include' }
    );
    load();
  }

  async function close(id) {
    await fetch(
      `http://localhost:3000/admin/forms/${id}/close`,
      { method: 'POST', credentials: 'include' }
    );
    load();
  }

  async function del(id) {
    if (!confirm('Delete draft form?')) return;

    await fetch(
      `http://localhost:3000/admin/forms/${id}`,
      { method: 'DELETE', credentials: 'include' }
    );
    load();
  }

  if (loading) return <p className="p-8">Loading…</p>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between mb-6">
        <h1 className="text-3xl font-semibold">
          Admin Dashboard
        </h1>

        <button
          onClick={onCreateNew}
          className="px-4 py-2 rounded bg-indigo-600 text-white"
        >
          + Create Form
        </button>
      </div>

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
                onResumeDraft(f.id);
              } else {
                onOpenResponses(f.id);
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
