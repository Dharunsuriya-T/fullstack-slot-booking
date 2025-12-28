import { useEffect, useMemo, useState } from 'react';

const API_BASE = 'http://localhost:3000';

export default function FormResponses({ formId, onBack }) {
  const [slots, setSlots] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    slot_id: '',
    department: '',
    year: ''
  });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [emailSummary, setEmailSummary] = useState(null);
  const [showEmail, setShowEmail] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    async function loadSlots() {
      const res = await fetch(
        `${API_BASE}/student/forms/${formId}/slots`,
        { credentials: 'include' }
      );
      const json = await res.json();
      setSlots(json.slots || []);
    }

    loadSlots();
  }, [formId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.slot_id) params.set('slot_id', filters.slot_id);
        if (filters.department) params.set('department', filters.department);
        if (filters.year) params.set('year', filters.year);

        const query = params.toString();
        const res = await fetch(
          `${API_BASE}/admin/forms/${formId}/responses${
            query ? `?${query}` : ''
          }`,
          { credentials: 'include' }
        );
        const d = await res.json();
        setData(d);
      } finally {
        setLoading(false);
        setSelectedIds(new Set());
      }
    }

    load();
  }, [formId, filters.slot_id, filters.department, filters.year]);

  const sortedRows = useMemo(() => {
    if (!data) return [];
    const rows = [...data.rows];
    rows.sort((a, b) => {
      if (sortBy === 'name') {
        const av = a.student.name || '';
        const bv = b.student.name || '';
        return sortDir === 'asc'
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }

      if (sortBy === 'slot') {
        const aKey = a.slot
          ? `${a.slot.date} ${a.slot.start_time}`
          : '';
        const bKey = b.slot
          ? `${b.slot.date} ${b.slot.start_time}`
          : '';
        return sortDir === 'asc'
          ? aKey.localeCompare(bKey)
          : bKey.localeCompare(aKey);
      }

      if (sortBy === 'year') {
        const av = a.student.year || 0;
        const bv = b.student.year || 0;
        return sortDir === 'asc' ? av - bv : bv - av;
      }

      return 0;
    });
    return rows;
  }, [data, sortBy, sortDir]);

  const departments = useMemo(() => {
    if (!data) return [];
    const set = new Set(
      data.rows
        .map(r => r.student.department)
        .filter(Boolean)
    );
    return Array.from(set).sort();
  }, [data]);

  const years = useMemo(() => {
    if (!data) return [];
    const set = new Set(
      data.rows
        .map(r => r.student.year)
        .filter(v => v !== null && v !== undefined)
    );
    return Array.from(set).sort((a, b) => a - b);
  }, [data]);

  const totalSelected = selectedIds.size;

  function toggleSort(column) {
    setSortBy(prev => {
      if (prev === column) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return column;
    });
  }

  function toggleSelect(studentId) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function selectAllCurrent() {
    if (!data) return;
    setSelectedIds(new Set(sortedRows.map(r => r.student.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleSendEmails() {
    if (sending || totalSelected === 0) return;
    if (!subject.trim() || !message.trim()) {
      alert('Subject and message are required');
      return;
    }

    if (
      !confirm(
        `Send email to ${totalSelected} selected students?`
      )
    ) {
      return;
    }

    try {
      setSending(true);
      setEmailSummary(null);

      const res = await fetch(
        `${API_BASE}/admin/forms/${formId}/send-test-links`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_ids: Array.from(selectedIds),
            subject,
            message
          })
        }
      );
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to send emails');
      }

      setEmailSummary({
        requested: totalSelected,
        message: result.message || 'Emails processed'
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  if (loading && !data) {
    return <p className="p-8">Loading…</p>;
  }

  if (!data || !data.rows) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <button
          onClick={onBack}
          className="text-indigo-600 mb-4"
        >
          ← Back
        </button>
        <p>No responses yet.</p>
      </div>
    );
  }

  function handleExportCsv() {
    if (!data) return;

    const headers = [
      'Name',
      'Email',
      'Department',
      'Year',
      'Slot Date',
      'Slot Time',
      ...data.questions.map(q => q.question_text)
    ];

    const lines = [headers.join(',')];

    for (const row of sortedRows) {
      const base = [
        row.student.name || '',
        row.student.email || '',
        row.student.department || '',
        row.student.year != null ? String(row.student.year) : '',
        row.slot ? row.slot.date : '',
        row.slot
          ? `${row.slot.start_time} - ${row.slot.end_time}`
          : ''
      ];

      for (const q of data.questions) {
        base.push(row.answers[q.id] || '');
      }

      const escaped = base.map(value => {
        const str = String(value).replace(/"/g, '""');
        if (str.search(/("|,|\n)/g) >= 0) {
          return `"${str}"`;
        }
        return str;
      });

      lines.push(escaped.join(','));
    }

    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `form-${formId}-responses.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <button
        onClick={onBack}
        className="text-indigo-600 mb-4"
      >
        ← Back
      </button>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">
          Responses
        </h1>
        <div className="text-sm text-gray-600">
          {sortedRows.length} students • {totalSelected} selected
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Slot
          </label>
          <select
            className="border rounded px-3 py-2 text-sm"
            value={filters.slot_id}
            onChange={e =>
              setFilters(f => ({ ...f, slot_id: e.target.value }))
            }
          >
            <option value="">All slots</option>
            {slots.map(slot => (
              <option key={slot.id} value={slot.id}>
                {new Date(slot.slot_date).toDateString()} •{' '}
                {slot.start_time} • {slot.end_time}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Department
          </label>
          <select
            className="border rounded px-3 py-2 text-sm"
            value={filters.department}
            onChange={e =>
              setFilters(f => ({ ...f, department: e.target.value }))
            }
          >
            <option value="">All</option>
            {departments.map(dep => (
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Year
          </label>
          <select
            className="border rounded px-3 py-2 text-sm"
            value={filters.year}
            onChange={e =>
              setFilters(f => ({ ...f, year: e.target.value }))
            }
          >
            <option value="">All</option>
            {years.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 text-sm rounded bg-gray-800 text-white"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowEmail(s => !s)}
            disabled={sortedRows.length === 0}
            className="px-3 py-2 text-sm rounded bg-indigo-600 text-white disabled:bg-gray-300 disabled:text-gray-600"
          >
            Email Selected
          </button>
        </div>
      </div>

      <div className="overflow-auto border rounded mb-4">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="border p-2">
                <button
                  onClick={() => {
                    if (totalSelected === sortedRows.length) {
                      clearSelection();
                    } else {
                      selectAllCurrent();
                    }
                  }}
                  className="text-xs text-gray-600 underline"
                >
                  {totalSelected === sortedRows.length
                    ? 'Clear'
                    : 'Select all'}
                </button>
              </th>
              <th
                className="border p-2 cursor-pointer"
                onClick={() => toggleSort('name')}
              >
                Name
              </th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Dept</th>
              <th
                className="border p-2 cursor-pointer"
                onClick={() => toggleSort('year')}
              >
                Year
              </th>
              <th
                className="border p-2 cursor-pointer"
                onClick={() => toggleSort('slot')}
              >
                Slot
              </th>
              {data.questions.map(q => (
                <th
                  key={q.id}
                  className="border p-2"
                >
                  {q.question_text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r, idx) => (
              <tr key={idx}>
                <td className="border p-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.student.id)}
                    onChange={() => toggleSelect(r.student.id)}
                  />
                </td>
                <td className="border p-2">
                  {r.student.name}
                </td>
                <td className="border p-2">
                  {r.student.email}
                </td>
                <td className="border p-2">
                  {r.student.department}
                </td>
                <td className="border p-2">
                  {r.student.year}
                </td>
                <td className="border p-2">
                  {r.slot
                    ? `${new Date(
                        r.slot.date
                      ).toDateString()} • ${
                        r.slot.start_time
                      } • ${r.slot.end_time}`
                    : ''}
                </td>
                {data.questions.map(q => (
                  <td key={q.id} className="border p-2">
                    {r.answers[q.id] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEmail && (
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-2">
            Email selected students
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {totalSelected} students selected. Emails will be sent only once per
            student; duplicates are prevented by the backend.
          </p>
          <input
            className="w-full border rounded px-3 py-2 mb-3"
            placeholder="Subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
          <textarea
            className="w-full border rounded px-3 py-2 mb-3"
            rows={4}
            placeholder="Message body"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSendEmails}
              disabled={sending || totalSelected === 0}
              className="px-4 py-2 rounded bg-indigo-600 text-white disabled:bg-gray-300 disabled:text-gray-600"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
            {emailSummary && (
              <div className="text-sm text-gray-700">
                {emailSummary.message} ({emailSummary.requested} requested)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
