import { useState } from 'react';

/*
Steps:
1 → Basic Info
2 → Slots
3 → Questions
4 → Eligibility
5 → Review & Publish
*/

export default function CreateForm({ onBack }) {
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    title: '',
    description: ''
  });

  const [slots, setSlots] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [rules, setRules] = useState([]);

  /* 🔴 DEBUG — REMOVE LATER */
  console.log('CURRENT STEP:', step);

  function next() {
    setStep(prev => prev + 1);
  }

  function prev() {
    setStep(prev => prev - 1);
  }

  /* =======================
     STEP RENDER
  ======================= */

  if (step === 1) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <h2 className="text-2xl mb-4">Create Test</h2>

        <input
          className="border p-2 w-full mb-3"
          placeholder="Test title"
          value={form.title}
          onChange={e =>
            setForm({ ...form, title: e.target.value })
          }
        />

        <textarea
          className="border p-2 w-full mb-4"
          placeholder="Description (optional)"
          value={form.description}
          onChange={e =>
            setForm({ ...form, description: e.target.value })
          }
        />

        <div className="flex justify-between">
          <button onClick={onBack}>Cancel</button>
          <button
            onClick={next}
            disabled={!form.title}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <h2 className="text-2xl mb-4">Add Slots</h2>

        <button
          onClick={() =>
            setSlots([...slots, { date: '', cap: 30 }])
          }
          className="mb-4 px-3 py-2 bg-gray-200 rounded"
        >
          + Add Slot
        </button>

        {slots.map((s, i) => (
          <div key={i} className="mb-2">
            Slot {i + 1}
          </div>
        ))}

        <div className="flex justify-between">
          <button onClick={prev}>Back</button>
          <button
            onClick={next}
            disabled={slots.length === 0}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <h2 className="text-2xl mb-4">Questions</h2>

        <button
          onClick={() =>
            setQuestions([
              ...questions,
              { text: '', type: 'text', required: true }
            ])
          }
          className="mb-4 px-3 py-2 bg-gray-200 rounded"
        >
          + Add Question
        </button>

        {questions.map((q, i) => (
          <div key={i} className="mb-2">
            Question {i + 1}
          </div>
        ))}

        <div className="flex justify-between">
          <button onClick={prev}>Back</button>
          <button
            onClick={next}
            disabled={questions.length === 0}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <h2 className="text-2xl mb-4">Eligibility (Optional)</h2>

        <button
          onClick={() =>
            setRules([...rules, { field: '', op: '', value: '' }])
          }
          className="mb-4 px-3 py-2 bg-gray-200 rounded"
        >
          + Add Rule
        </button>

        <div className="flex justify-between">
          <button onClick={prev}>Back</button>
          <button
            onClick={next}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <h2 className="text-2xl mb-4">Review & Publish</h2>

        <pre className="bg-gray-100 p-3 text-sm">
          {JSON.stringify(
            { form, slots, questions, rules },
            null,
            2
          )}
        </pre>

        <div className="flex justify-between mt-4">
          <button onClick={prev}>Back</button>
          <button className="bg-green-600 text-white px-4 py-2 rounded">
            Publish
          </button>
        </div>
      </div>
    );
  }

  return null;
}
