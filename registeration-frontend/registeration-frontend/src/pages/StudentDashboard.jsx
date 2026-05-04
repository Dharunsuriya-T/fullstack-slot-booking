import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentForms, withdrawSubmission, logout } from '../api/student';

export default function StudentDashboard({ user }) {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [error, setError] = useState('');
  const [confirmWithdrawId, setConfirmWithdrawId] = useState(null);

  useEffect(() => {
    async function loadForms() {
      try {
        const data = await getStudentForms();
        setForms(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadForms();
  }, []);

  async function handleWithdrawAndReapply(formId) {
    try {
      setError('');
      setConfirmWithdrawId(null);
      setWithdrawingId(formId);
      await withdrawSubmission(formId);

      setForms(prev =>
        prev.map(f =>
          f.id === formId
            ? { ...f, already_submitted: false }
            : f
        )
      );

      navigate(`/form/${formId}`);
    } catch (err) {
      setError(err.message || 'Failed to withdraw submission');
    } finally {
      setWithdrawingId(null);
    }
  }

  function requestWithdraw(formId) {
    setError('');
    setConfirmWithdrawId(formId);
  }

  async function handleLogout() {
    try {
      setError('');
      await logout();
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Logout failed');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading tests…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Available Tests</h1>
          <p className="text-gray-500">Welcome, {user.name}</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="mb-6 border border-red-200 bg-red-50 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {confirmWithdrawId && (
        <div className="mb-6 border border-yellow-200 bg-yellow-50 text-yellow-900 px-4 py-3 rounded">
          <div className="font-medium mb-2">Confirm withdrawal</div>
          <div className="text-sm mb-3">
            This will delete your current submission and free your slot so you can
            reapply.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleWithdrawAndReapply(confirmWithdrawId)}
              className="px-3 py-1 rounded bg-gray-900 text-white"
            >
              Yes, withdraw
            </button>
            <button
              type="button"
              onClick={() => setConfirmWithdrawId(null)}
              className="px-3 py-1 rounded border border-gray-300 text-gray-700 bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {forms.length === 0 ? (
        <p className="text-gray-500">
          No tests available at the moment.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {forms.map(form => (
            <div
              key={form.id}
              className="
                bg-white rounded-xl p-6
                shadow-sm hover:shadow-md
                transition border
              "
            >
              <h2 className="text-xl font-semibold mb-2">
                {form.title}
              </h2>

              <p className="text-gray-600 mb-4">
                Test Date: {form.test_date || '—'}
              </p>

              {form.already_submitted ? (
                <div className="space-y-2">
                  <button
                    disabled
                    className="
                      w-full py-2 rounded-lg
                      bg-gray-300 text-gray-600
                      cursor-not-allowed
                    "
                  >
                    Submitted
                  </button>
                  <button
                    type="button"
                    onClick={() => requestWithdraw(form.id)}
                    disabled={withdrawingId === form.id}
                    className="
                      w-full py-2 rounded-lg
                      border border-red-500 text-red-600
                      hover:bg-red-50
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    {withdrawingId === form.id
                      ? 'Withdrawing…'
                      : 'Withdraw & Reapply'}
                  </button>
                </div>
              ) : (
                <button
                  className="
                    w-full py-2 rounded-lg
                    bg-indigo-600 text-white
                    hover:bg-indigo-700
                  "
                  onClick={() => onOpenForm(form.id)}
                >
                  Apply
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
