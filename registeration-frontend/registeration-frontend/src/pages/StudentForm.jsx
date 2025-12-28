import { useEffect, useRef, useState } from 'react';
import { getFormDetails, getSlots, submitForm } from '../api/student';

export default function StudentForm({ formId, onBack }) {
  const DRAFT_KEY = `student_form_draft_${formId}`;
  const [data, setData] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const formData = await getFormDetails(formId);
        const slotData = await getSlots(formId);

        setData(formData);
        setSlots(slotData);
      } catch (err) {
        console.error(err);
        alert('Failed to load form');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [formId]);

  const hasRestoredDraft = useRef(false);

  useEffect(() => {
    if (!data || hasRestoredDraft.current) return;

    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);

      if (draft.selectedSlot) {
        setSelectedSlot(draft.selectedSlot);
      }
      if (draft.answers && typeof draft.answers === 'object') {
        setAnswers(draft.answers);
      }
      hasRestoredDraft.current = true;
    } catch {
      // ignore draft errors
    }
  }, [DRAFT_KEY, data]);

  useEffect(() => {
    if (!data) return;
    try {
      const payload = {
        selectedSlot,
        answers
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [DRAFT_KEY, data, selectedSlot, answers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  const { form, questions, eligibility_rules } = data;

  /* =========================
     VALIDATION
  ========================= */
  const missingRequired = questions.some(
    q => q.is_required && !answers[q.id]
  );

  const canSubmit =
    selectedSlot &&
    !missingRequired &&
    !submitting;

  /* =========================
     SUBMIT
  ========================= */
  async function handleSubmit() {
    if (!canSubmit) return;

    try {
      setSubmitting(true);

      await submitForm(formId, {
        slot_id: selectedSlot,
        answers: Object.entries(answers).map(
          ([question_id, value]) => ({
            question_id,
            value
          })
        )
      });

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }

      alert('Submission successful');
      onBack();
    } catch (err) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  /* =========================
     RENDER INPUT BY TYPE
  ========================= */
  function renderInput(q) {
    const value = answers[q.id] || '';

    if (q.input_type === 'NUMBER') {
      return (
        <input
          type="number"
          value={value}
          onChange={e =>
            setAnswers({ ...answers, [q.id]: e.target.value })
          }
          className="w-full border rounded px-3 py-2"
        />
      );
    }

    if (q.input_type === 'YES_NO') {
      return (
        <div className="flex gap-4">
          {['Yes', 'No'].map(opt => (
            <label key={opt} className="flex items-center gap-2">
              <input
                type="radio"
                name={q.id}
                value={opt}
                checked={value === opt}
                onChange={() =>
                  setAnswers({ ...answers, [q.id]: opt })
                }
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    // TEXT (default)
    return (
      <input
        type="text"
        value={value}
        onChange={e =>
          setAnswers({ ...answers, [q.id]: e.target.value })
        }
        className="w-full border rounded px-3 py-2"
      />
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="text-indigo-600 mb-6"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-semibold mb-4">
        {form.title}
      </h1>

      {/* =========================
         ELIGIBILITY (READ-ONLY)
      ========================= */}
      {eligibility_rules.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border rounded">
          <h3 className="font-semibold mb-2">
            Eligibility Criteria
          </h3>
          <ul className="list-disc ml-5 text-sm">
            {eligibility_rules.map((r, idx) => (
              <li key={idx}>
                {r.source} {r.operator} {r.value}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* =========================
         SLOT SELECTION
      ========================= */}
      <h2 className="text-xl font-semibold mb-2">
        Select a Slot
      </h2>

      <div className="grid gap-3 mb-8">
        {slots.map(slot => (
          <button
            key={slot.id}
            onClick={() => setSelectedSlot(slot.id)}
            className={`
              p-4 rounded border text-left
              ${selectedSlot === slot.id
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200'}
            `}
          >
            <div className="font-medium">
              {new Date(slot.slot_date).toDateString()}
            </div>
            <div className="text-sm text-gray-600">
              {slot.start_time} – {slot.end_time}
            </div>
            <div className="text-sm text-gray-500">
              Remaining: {slot.remaining}
            </div>
          </button>
        ))}
      </div>

      {/* =========================
         QUESTIONS
      ========================= */}
      <h2 className="text-xl font-semibold mb-4">
        Questions
      </h2>

      <div className="space-y-6 mb-8">
        {questions.map(q => (
          <div key={q.id}>
            <label className="block font-medium mb-1">
              {q.question_text}
              {q.is_required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>

            {renderInput(q)}
          </div>
        ))}
      </div>

      {/* =========================
         SUBMIT
      ========================= */}
      <button
        disabled={!canSubmit}
        onClick={handleSubmit}
        className={`
          w-full py-3 rounded-lg font-medium
          ${canSubmit
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-gray-300 text-gray-600 cursor-not-allowed'}
        `}
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </div>
  );
}
