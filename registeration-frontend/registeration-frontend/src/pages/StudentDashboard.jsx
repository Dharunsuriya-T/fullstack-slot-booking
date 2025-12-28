import { useEffect, useState } from 'react';
import { getStudentForms, withdrawSubmission } from '../api/student';

export default function StudentDashboard({ user, onOpenForm }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawingId, setWithdrawingId] = useState(null);

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
    if (
      !window.confirm(
        'This will delete your current submission and free your slot so you can reapply. Continue?'
      )
    ) {
      return;
    }

    try {
      setWithdrawingId(formId);
      await withdrawSubmission(formId);

      setForms(prev =>
        prev.map(f =>
          f.id === formId
            ? { ...f, already_submitted: false }
            : f
        )
      );

      onOpenForm(formId);
    } catch (err) {
      alert(err.message || 'Failed to withdraw submission');
    } finally {
      setWithdrawingId(null);
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
      <h1 className="text-3xl font-semibold mb-2">
        Available Tests
      </h1>

      <p className="text-gray-500 mb-8">
        Welcome, {user.name}
      </p>

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
                    onClick={() => handleWithdrawAndReapply(form.id)}
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
