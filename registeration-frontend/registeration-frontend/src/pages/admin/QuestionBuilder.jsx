import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function QuestionBuilder({ formId, onBack, onNext }) {
  const STORAGE_KEY = `draft_questions_${formId}`;

  const [questions, setQuestions] = useState([]);
  const [text, setText] = useState('');
  const [type, setType] = useState('TEXT');
  const [required, setRequired] = useState(false);
  const [error, setError] = useState('');

  // Optional eligibility
  const [eligibilityEnabled, setEligibilityEnabled] = useState(false);
  const [operator, setOperator] = useState('>=');
  const [value, setValue] = useState('');

  /* Load draft */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setQuestions(JSON.parse(saved));
  }, []);

  /* Save draft */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  }, [questions]);

  function addQuestion() {
    if (!text.trim()) {
      setError('Question text required');
      return;
    }

    setError('');

    setQuestions(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        question_text: text,
        input_type: type,
        is_required: required,
        eligibility: eligibilityEnabled
          ? { operator, value }
          : null
      }
    ]);

    setText('');
    setType('TEXT');
    setRequired(false);
    setEligibilityEnabled(false);
    setValue('');
  }

  async function saveQuestions() {
    for (const q of questions) {
      const res = await fetch(
        `${API}/admin/forms/${formId}/questions`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_text: q.question_text,
            input_type: q.input_type,
            is_required: q.is_required
          })
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      if (q.eligibility) {
        await fetch(
          `${API}/admin/forms/${formId}/eligibility`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: 'ANSWER',
              question_id: data.question.id,
              operator: q.eligibility.operator,
              value: q.eligibility.value
            })
          }
        );
      }
    }

    localStorage.removeItem(STORAGE_KEY);
    setError('');
    onNext();
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button onClick={onBack} className="text-indigo-600 mb-6">
        ← Back
      </button>

      {error && (
        <div className="mb-6 border border-red-200 bg-red-50 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <h1 className="text-3xl font-semibold mb-6">
        Add Questions
      </h1>

      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <input
          className="w-full border p-2 rounded mb-3"
          placeholder="Question text"
          value={text}
          onChange={e => setText(e.target.value)}
        />

        <div className="flex gap-4 mb-3">
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="TEXT">Text</option>
            <option value="NUMBER">Number</option>
            <option value="YES_NO">Yes / No</option>
            <option value="DROPDOWN">Dropdown</option>
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={required}
              onChange={e => setRequired(e.target.checked)}
            />
            Required
          </label>
        </div>

        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={eligibilityEnabled}
            onChange={e => setEligibilityEnabled(e.target.checked)}
          />
          Set eligibility for this question
        </label>

        {eligibilityEnabled && (
          <div className="flex gap-2 mb-3">
            <select
              value={operator}
              onChange={e => setOperator(e.target.value)}
              className="border p-2 rounded"
            >
              <option value=">=">≥</option>
              <option value="<=">≤</option>
              <option value="=">=</option>
            </select>

            <input
              placeholder="Value"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="border p-2 rounded"
            />
          </div>
        )}

        <button
          onClick={addQuestion}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Add Question
        </button>
      </div>

      <button
        onClick={saveQuestions}
        className="w-full py-3 rounded-lg bg-indigo-600 text-white"
      >
        Save & Continue
      </button>
    </div>
  );
}
