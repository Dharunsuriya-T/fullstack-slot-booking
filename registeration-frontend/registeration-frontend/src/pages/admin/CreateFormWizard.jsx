import { useEffect, useState } from 'react';

const API = 'http://localhost:3000/admin';
const STUDENT_API = 'http://localhost:3000/student';
const DRAFT_KEY = 'adminDraftProgress';
const DEPARTMENT_OPTIONS = [
  'CSE',
  'CSD',
  'IT',
  'MTS',
  'AIDS',
  'AIML',
  'MECH'
];

export default function CreateFormWizard({ onExit, formId: initialFormId }) {
  /* ======================
     WIZARD STATE
  ====================== */
  const [step, setStep] = useState(1);
  const [formId, setFormId] = useState(null);

  /* ======================
     PUBLISH / SCHEDULING
  ====================== */
  const [publishMode, setPublishMode] = useState('NOW');
  const [publishAt, setPublishAt] = useState('');
  const [closeAt, setCloseAt] = useState('');

  /* ======================
     FORM DETAILS
  ====================== */
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [testDate, setTestDate] = useState('');
  const [allowedDepartments, setAllowedDepartments] = useState([]);
  const [hasExistingDepartmentRule, setHasExistingDepartmentRule] =
    useState(false);

  /* ======================
     SLOTS
  ====================== */
  const [slots, setSlots] = useState([]);
  const [slotDate, setSlotDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState('');

  /* ======================
     QUESTIONS
  ====================== */
  const [questions, setQuestions] = useState([]);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('TEXT');
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionEligibility, setQuestionEligibility] = useState({});
  const [qEligibilityEnabled, setQEligibilityEnabled] = useState(false);
  const [qEligibilityOperator, setQEligibilityOperator] =
    useState('>=');
  const [qEligibilityValue, setQEligibilityValue] = useState('');

  /* ======================
     DRAFT RESTORE ON LOAD
  ====================== */
  useEffect(() => {
    // If admin dashboard passes an explicit draft id, prefer that.
    if (!initialFormId) {
      // Creating a brand new form: start on details step with no pre-existing formId.
      return;
    }

    setFormId(initialFormId);

    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.formId === initialFormId && draft.step) {
          setStep(draft.step);
          return;
        }
      } catch {
        // ignore bad draft
      }
    }

    // Default resume into Slots step for existing drafts
    setStep(2);
  }, [initialFormId]);

  /* ======================
     LOAD EXISTING FORM DATA
  ====================== */
  useEffect(() => {
    if (!formId) return;

    async function loadExisting() {
      try {
        const [formRes, slotsRes] = await Promise.all([
          fetch(`${STUDENT_API}/forms/${formId}`, {
            credentials: 'include'
          }),
          fetch(`${STUDENT_API}/forms/${formId}/slots`, {
            credentials: 'include'
          })
        ]);

        if (formRes.ok) {
          const json = await formRes.json();
          if (json.form) {
            setTitle(json.form.title || '');
            setDescription(json.form.description || '');
            if (json.form.test_date) {
              // Trim to yyyy-MM-ddTHH:mm for datetime-local
              setTestDate(String(json.form.test_date).slice(0, 16));
            }
          }
          if (Array.isArray(json.questions)) {
            setQuestions(json.questions);
          }

          if (Array.isArray(json.eligibility_rules)) {
            const qElig = {};
            let deptList = [];
            let hasDeptRule = false;

            json.eligibility_rules.forEach(rule => {
              if (rule.source === 'ANSWER' && rule.question_id) {
                qElig[rule.question_id] = {
                  operator: rule.operator,
                  value: rule.value
                };
              }

              if (
                rule.source === 'STUDENT' &&
                rule.student_field === 'department'
              ) {
                hasDeptRule = true;
                if (rule.operator === 'IN') {
                  deptList = rule.value
                    .split(',')
                    .map(v => v.trim())
                    .filter(Boolean);
                } else if (rule.value) {
                  deptList = [rule.value];
                }
              }
            });

            setQuestionEligibility(qElig);
            if (deptList.length > 0) {
              setAllowedDepartments(deptList);
            }
            setHasExistingDepartmentRule(hasDeptRule);
          }
        }

        if (slotsRes.ok) {
          const jsonSlots = await slotsRes.json();
          if (Array.isArray(jsonSlots.slots)) {
            setSlots(jsonSlots.slots);
          }
        }
      } catch (err) {
        // For admins, it's better to log silently than block the flow
        console.error('Failed to load existing form data', err);
      }
    }

    loadExisting();
  }, [formId]);

  function saveDraft(stepNum) {
    if (!formId) return;
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ formId, step: stepNum })
    );
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  function toggleDepartment(dep) {
    setAllowedDepartments(prev =>
      prev.includes(dep)
        ? prev.filter(d => d !== dep)
        : [...prev, dep]
    );
  }

  /* ======================
     STEP 1 — CREATE DRAFT
  ====================== */
  async function createDraft() {
    if (!title.trim()) {
      alert('Title required');
      return;
    }

    // If form already exists (resuming draft), just move to next step
    if (formId) {
      setStep(2);
      saveDraft(2);
      return;
    }

    const res = await fetch(`${API}/forms`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        test_date: testDate || null
      })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }

    setFormId(data.form.id);
    setStep(2);
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ formId: data.form.id, step: 2 })
    );
  }

  /* ======================
     STEP 2 — ADD SLOT
  ====================== */
  async function addSlot() {
    if (!slotDate || !startTime || !endTime || !capacity) {
      alert('Fill all slot fields');
      return;
    }

    const res = await fetch(
      `${API}/forms/${formId}/slots`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_date: slotDate,
          max_capacity: Number(capacity),
          start_time: startTime,
          end_time: endTime,
          
        })
      }
    );

    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }

    setSlots(prev => [...prev, data.slot]);
    setSlotDate('');
    setCapacity('');
    setStartTime('');
    setEndTime('');
  }

  async function removeSlot(slotId) {
    if (!formId) return;
    if (!window.confirm('Remove this slot?')) return;

    const res = await fetch(
      `${API}/forms/${formId}/slots/${slotId}`,
      {
        method: 'DELETE',
        credentials: 'include'
      }
    );

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to delete slot');
      return;
    }

    setSlots(prev => prev.filter(s => s.id !== slotId));
  }

  /* ======================
     STEP 3 — ADD QUESTION
  ====================== */
  async function addQuestion() {
    if (!qText.trim()) {
      alert('Question text required');
      return;
    }
    const editingId = editingQuestionId;
    const currentType = qType;
    const currentEligibilityEnabled = qEligibilityEnabled;
    const currentEligibilityOperator = qEligibilityOperator;
    const currentEligibilityValue = qEligibilityValue.trim();

    // If editing, delete the previous version first
    if (editingId) {
      const delRes = await fetch(
        `${API}/forms/${formId}/questions/${editingId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      const delData = await delRes.json();
      if (!delRes.ok) {
        alert(delData.error || 'Failed to update question');
        return;
      }
    }

    const res = await fetch(
      `${API}/forms/${formId}/questions`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: qText,
          input_type: qType,
          is_required: true
        })
      }
    );

    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }

    const createdQuestion = data.question;

    setQuestions(prev => {
      if (!editingId) return [...prev, createdQuestion];
      return [
        ...prev.filter(q => q.id !== editingId),
        createdQuestion
      ];
    });

    if (
      currentType === 'NUMBER' &&
      currentEligibilityEnabled &&
      currentEligibilityValue !== ''
    ) {
      try {
        const ruleRes = await fetch(
          `${API}/forms/${formId}/eligibility`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: 'ANSWER',
              question_id: createdQuestion.id,
              operator: currentEligibilityOperator,
              value: currentEligibilityValue
            })
          }
        );

        const ruleData = await ruleRes.json();
        if (!ruleRes.ok) {
          alert(ruleData.error || 'Failed to save eligibility rule');
        } else {
          setQuestionEligibility(prev => ({
            ...prev,
            [createdQuestion.id]: {
              operator: currentEligibilityOperator,
              value: currentEligibilityValue
            }
          }));
        }
      } catch (err) {
        console.error('Failed to save eligibility rule', err);
        alert('Failed to save eligibility rule');
      }
    }

    setQText('');
    setQType('TEXT');
    setEditingQuestionId(null);
    setQEligibilityEnabled(false);
    setQEligibilityOperator('>=');
    setQEligibilityValue('');
  }

  function startEditQuestion(question) {
    setEditingQuestionId(question.id);
    setQText(question.question_text || '');
    const inputType = question.input_type || 'TEXT';
    setQType(inputType);

    const existing = questionEligibility[question.id];
    if (inputType === 'NUMBER' && existing) {
      setQEligibilityEnabled(true);
      setQEligibilityOperator(existing.operator || '>=');
      setQEligibilityValue(
        existing.value != null ? String(existing.value) : ''
      );
    } else {
      setQEligibilityEnabled(false);
      setQEligibilityOperator('>=');
      setQEligibilityValue('');
    }
  }

  async function removeQuestion(questionId) {
    if (!formId) return;
    if (!window.confirm('Delete this question?')) return;

    const res = await fetch(
      `${API}/forms/${formId}/questions/${questionId}`,
      {
        method: 'DELETE',
        credentials: 'include'
      }
    );

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to delete question');
      return;
    }

    setQuestions(prev => prev.filter(q => q.id !== questionId));

    setQuestionEligibility(prev => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });

    if (editingQuestionId === questionId) {
      setEditingQuestionId(null);
      setQText('');
      setQType('TEXT');
    }
  }

  /* ======================
     STEP 4 — PUBLISH
  ====================== */
  async function publishForm() {
    if (slots.length === 0 || questions.length === 0) {
      alert('Add slots and questions first');
      return;
    }

    if (allowedDepartments.length > 0 && !hasExistingDepartmentRule) {
      try {
        const ruleRes = await fetch(
          `${API}/forms/${formId}/eligibility`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: 'STUDENT',
              student_field: 'department',
              operator: 'IN',
              value: allowedDepartments.join(',')
            })
          }
        );

        const ruleData = await ruleRes.json();
        if (!ruleRes.ok) {
          alert(
            ruleData.error || 'Failed to save department eligibility'
          );
          return;
        }
      } catch (err) {
        alert(err.message || 'Failed to save department eligibility');
        return;
      }
    }

    let requestBody = null;
    const isSchedule = publishMode === 'SCHEDULE';
    if (isSchedule) {
      if (!publishAt) {
        alert('Please select a publish date & time');
        return;
      }

      const publishDate = new Date(publishAt);
      if (Number.isNaN(publishDate.valueOf())) {
        alert('Invalid publish date & time');
        return;
      }

      if (closeAt) {
        const closeDate = new Date(closeAt);
        if (Number.isNaN(closeDate.valueOf())) {
          alert('Invalid close date & time');
          return;
        }
        if (closeDate <= publishDate) {
          alert('Close date must be after publish date');
          return;
        }
      }

      requestBody = {
        mode: 'SCHEDULE',
        publish_at: publishAt,
        close_at: closeAt ? closeAt : null
      };
    }

    const res = await fetch(`${API}/forms/${formId}/publish`, {
      method: 'POST',
      credentials: 'include',
      headers: requestBody ? { 'Content-Type': 'application/json' } : undefined,
      body: requestBody ? JSON.stringify(requestBody) : undefined
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }

    clearDraft();
    alert(isSchedule ? 'Form scheduled' : 'Form published');
    onExit();
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <button
        onClick={() => {
          clearDraft();
          onExit();
        }}
        className="mb-6 text-indigo-600"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-semibold mb-6">Create Form</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-3 text-sm text-gray-600 mb-8">
        <span
          className={`px-2 py-1 rounded-full ${
            step === 1
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          1. Details
        </span>
        <span className="text-gray-400">→</span>
        <span
          className={`px-2 py-1 rounded-full ${
            step === 2
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          2. Slots
        </span>
        <span className="text-gray-400">→</span>
        <span
          className={`px-2 py-1 rounded-full ${
            step === 3
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          3. Questions
        </span>
        <span className="text-gray-400">→</span>
        <span
          className={`px-2 py-1 rounded-full ${
            step === 4
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          4. Review & publish
        </span>
      </div>

      {step === 1 && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Form title *
            </label>
            <input
              className="w-full border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded px-3 py-2"
              placeholder="e.g. Placement Drive – April 2025"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded px-3 py-2"
              rows={3}
              placeholder="Short summary for students (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test date & time (optional)
            </label>
            <input
              type="datetime-local"
              className="w-full border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded px-3 py-2"
              value={testDate}
              onChange={e => setTestDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Students will see this as the planned test date. Publishing and closing
              are still controlled from the dashboard.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Eligible departments (optional)
            </label>
            <p className="mt-1 text-xs text-gray-500">
              If you select departments, only students from these departments will be
              allowed to apply. Leave empty to allow all departments.
            </p>

            {hasExistingDepartmentRule ? (
              <p className="mt-2 text-sm text-gray-700">
                Already restricted to:{' '}
                {allowedDepartments.length > 0
                  ? allowedDepartments.join(', ')
                  : 'configured in backend'}
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {DEPARTMENT_OPTIONS.map(dep => {
                  const selected = allowedDepartments.includes(dep);
                  return (
                    <button
                      key={dep}
                      type="button"
                      onClick={() => toggleDepartment(dep)}
                      className={`px-2 py-1 rounded border text-xs ${
                        selected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {dep}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={createDraft}
              disabled={!title.trim()}
              className={`px-4 py-2 rounded-lg font-medium ${
                title.trim()
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
            >
              Next → Slots
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-2">Slots</h2>
            <p className="text-sm text-gray-600 mb-4">
              Define the dates, times, and capacity for each slot students can book.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={slotDate}
                  onChange={e => setSlotDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity *
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Max students for this slot"
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start time *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End time *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={addSlot}
                className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900"
              >
                + Add slot
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-3">
              Added slots ({slots.length})
            </h3>
            {slots.length === 0 ? (
              <p className="text-sm text-gray-500">
                No slots added yet. Add at least one slot to continue.
              </p>
            ) : (
              <div className="space-y-3">
                {slots.map((slot, index) => (
                  <div
                    key={slot.id || index}
                    className="flex items-center justify-between border rounded-lg px-4 py-3 bg-gray-50"
                  >
                    <div>
                      <div className="font-medium">
                        Slot {index + 1}{' '}
                        {slot.slot_date && (
                          <span className="text-gray-600">
                            – {new Date(slot.slot_date).toDateString()}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {slot.start_time} – {slot.end_time}
                      </div>
                      <div className="text-xs text-gray-500">
                        Capacity: {slot.max_capacity}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSlot(slot.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => {
                setStep(1);
                saveDraft(1);
              }}
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                setStep(3);
                saveDraft(3);
              }}
              disabled={slots.length === 0}
              className={`px-4 py-2 rounded-lg font-medium ${
                slots.length === 0
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Next → Questions
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-2">Questions</h2>
            <p className="text-sm text-gray-600 mb-4">
              Add the fields you want students to fill. You can edit or delete
              questions below.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question text *
              </label>
              <input
                className="w-full border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded px-3 py-2"
                placeholder="e.g. CGPA, Department, Are you willing to relocate?"
                value={qText}
                onChange={e => setQText(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Answer type
              </label>
              <select
                className="w-full border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded px-3 py-2"
                value={qType}
                onChange={e => {
                  const newType = e.target.value;
                  setQType(newType);
                  if (newType !== 'NUMBER') {
                    setQEligibilityEnabled(false);
                    setQEligibilityOperator('>=');
                    setQEligibilityValue('');
                  }
                }}
              >
                <option value="TEXT">Text</option>
                <option value="NUMBER">Number</option>
                <option value="YES_NO">Yes / No</option>
              </select>
            </div>

            {qType === 'NUMBER' && (
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={qEligibilityEnabled}
                    onChange={e =>
                      setQEligibilityEnabled(e.target.checked)
                    }
                  />
                  <span>
                    Set eligibility based on this number (optional)
                  </span>
                </label>

                {qEligibilityEnabled && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-700">
                      Student eligible if answer
                    </span>
                    <select
                      value={qEligibilityOperator}
                      onChange={e =>
                        setQEligibilityOperator(e.target.value)
                      }
                      className="border border-gray-300 rounded px-2 py-1"
                    >
                      <option value=">=">≥</option>
                      <option value="<=">≤</option>
                      <option value="=">=</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Value"
                      value={qEligibilityValue}
                      onChange={e =>
                        setQEligibilityValue(e.target.value)
                      }
                      className="w-24 border border-gray-300 rounded px-2 py-1"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={addQuestion}
                className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900"
              >
                {editingQuestionId ? 'Update question' : 'Add question'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-3">
              Added questions ({questions.length})
            </h3>
            {questions.length === 0 ? (
              <p className="text-sm text-gray-500">
                No questions added yet. Add at least one to continue.
              </p>
            ) : (
              <div className="space-y-3">
                {questions.map((q, index) => (
                  <div
                    key={q.id || index}
                    className="flex items-start justify-between border rounded-lg px-4 py-3 bg-gray-50"
                  >
                    <div>
                      <div className="text-sm text-gray-500 mb-1">
                        Question {index + 1}
                      </div>
                      <div className="font-medium mb-1">
                        {q.question_text}
                      </div>
                      <div className="text-xs text-gray-500 uppercase">
                        {q.input_type === 'NUMBER'
                          ? 'Number'
                          : q.input_type === 'YES_NO'
                          ? 'Yes / No'
                          : 'Text'}
                      </div>
                      {q.input_type === 'NUMBER' &&
                        questionEligibility[q.id] && (
                          <div className="text-xs text-green-600 mt-1">
                            Eligibility: answer{' '}
                            {questionEligibility[q.id].operator}{' '}
                            {questionEligibility[q.id].value}
                          </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1 text-sm">
                      <button
                        type="button"
                        onClick={() => startEditQuestion(q)}
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => {
                setStep(2);
                saveDraft(2);
              }}
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                setStep(4);
                saveDraft(4);
              }}
              disabled={questions.length === 0}
              className={`px-4 py-2 rounded-lg font-medium ${
                questions.length === 0
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              Review & Publish
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-6 space-y-2">
            <h2 className="text-xl font-semibold mb-2">Review form</h2>
            <div>
              <div className="text-sm text-gray-500">Title</div>
              <div className="font-medium">{title}</div>
            </div>
            {description && (
              <div>
                <div className="text-sm text-gray-500">Description</div>
                <div className="text-gray-700">{description}</div>
              </div>
            )}
            {testDate && (
              <div>
                <div className="text-sm text-gray-500">Test date</div>
                <div className="text-gray-700">
                  {new Date(testDate).toLocaleString()}
                </div>
              </div>
            )}

            {allowedDepartments.length > 0 && (
              <div>
                <div className="text-sm text-gray-500">
                  Eligible departments
                </div>
                <div className="text-gray-700 text-sm">
                  {allowedDepartments.join(', ')}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="text-lg font-semibold">Publishing</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 border rounded-lg px-3 py-2">
                <input
                  type="radio"
                  name="publishMode"
                  value="NOW"
                  checked={publishMode === 'NOW'}
                  onChange={() => setPublishMode('NOW')}
                />
                <span className="font-medium">Publish now</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700 border rounded-lg px-3 py-2">
                <input
                  type="radio"
                  name="publishMode"
                  value="SCHEDULE"
                  checked={publishMode === 'SCHEDULE'}
                  onChange={() => setPublishMode('SCHEDULE')}
                />
                <span className="font-medium">Schedule publish</span>
              </label>
            </div>

            {publishMode === 'SCHEDULE' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Publish date & time *
                  </label>
                  <input
                    type="datetime-local"
                    value={publishAt}
                    onChange={e => setPublishAt(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Students cannot open the form before this time.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Close date & time (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={closeAt}
                    onChange={e => setCloseAt(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty if you want to close manually later.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-3">
              Slots ({slots.length})
            </h3>
            {slots.length === 0 ? (
              <p className="text-sm text-gray-500">No slots configured.</p>
            ) : (
              <div className="space-y-3">
                {slots.map((slot, index) => (
                  <div
                    key={slot.id || index}
                    className="border rounded-lg px-4 py-3 bg-gray-50"
                  >
                    <div className="font-medium">
                      Slot {index + 1}{' '}
                      {slot.slot_date && (
                        <span className="text-gray-600">
                          – {new Date(slot.slot_date).toDateString()}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {slot.start_time} – {slot.end_time}
                    </div>
                    <div className="text-xs text-gray-500">
                      Capacity: {slot.max_capacity}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-3">
              Questions ({questions.length})
            </h3>
            {questions.length === 0 ? (
              <p className="text-sm text-gray-500">No questions configured.</p>
            ) : (
              <ol className="space-y-3 list-decimal list-inside">
                {questions.map((q, index) => (
                  <li key={q.id || index} className="space-y-1">
                    <div className="font-medium">{q.question_text}</div>
                    <div className="text-xs text-gray-500 uppercase">
                      {q.input_type === 'NUMBER'
                        ? 'Number'
                        : q.input_type === 'YES_NO'
                        ? 'Yes / No'
                        : 'Text'}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => {
                setStep(3);
                saveDraft(3);
              }}
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              ← Back
            </button>
            <button
              onClick={publishForm}
              disabled={publishMode === 'SCHEDULE' && !publishAt}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              {publishMode === 'SCHEDULE' ? 'Schedule & Publish' : 'Publish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
