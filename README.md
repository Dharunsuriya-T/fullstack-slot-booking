# 🎓 Placement Registration & Slot Booking System

A **production-grade, scalable web application** for managing **eligibility-based student registrations and slot bookings** for placement tests, assessments, or enrollment processes.

This system is designed to handle **high concurrency**, **strict fairness**, and **admin-controlled eligibility**, with a clean student experience.

---

## ❗ What This Application Is

✔ A **criteria-based registration system**  
✔ First-come-first-serve **slot booking**  
✔ Secure **college email authentication**  
✔ Admin-controlled **eligibility rules**  
✔ Real-time response limits  
✔ Exportable data (CSV / Excel)  
✔ Email automation for shortlisted students  

---



This app controls **WHO can register**, **WHEN**, and **UNDER WHAT CONDITIONS** .

---

## Key Features
**👨‍🎓 Student Side**
<ol>
Google OAuth login (college domain restricted)

View available tests/forms

View eligibility criteria before applying

Select one slot (date & time) per test

First-come-first-serve slot booking

One submission per student (hard-enforced)

Clear messages when form/slot is full or closed

Secure session via JWT HttpOnly cookies
</ol>

**👩‍💼 Admin Side**
<ol>
Secure admin-only access

Create forms in DRAFT mode

Add:

Multiple slots (date, time, capacity)

Questions (text / number / dropdown / yes-no)

Eligibility rules (CGPA, backlog, department, year, etc.)

Edit everything before publishing

Publish form → visible to students

Close form anytime

Delete drafts safely

View all responses

Export responses to CSV / Excel
</ol>

##Send test links via email (SendGrid)
---
**🧠 Core Design Principles**
<ol>
Database-enforced fairness

Transaction-safe submissions

Stateless backend

High concurrency safe

No client-side trust

Admin mistakes are recoverable

</ol>

## 🛢️ Database Schema (COPY–PASTE)

### Enable UUID support
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

--admins
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
--forms
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('DRAFT','OPEN','CLOSED')),
  max_responses INTEGER,
  current_responses INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

--slots
CREATE TABLE slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INTEGER NOT NULL,
  current_bookings INTEGER DEFAULT 0
);

--questions

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  input_type TEXT CHECK (input_type IN ('TEXT','NUMBER','DROPDOWN','YES_NO')),
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

--eligibility_rules
CREATE TABLE eligibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  source TEXT CHECK (source IN ('STUDENT','ANSWER')),
  question_id UUID REFERENCES questions(id),
  student_field TEXT,
  operator TEXT CHECK (operator IN ('>=','<=','=','IN')),
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
--responses
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id),
  student_id UUID REFERENCES students(id),
  slot_id UUID REFERENCES slots(id),
  submitted_at TIMESTAMP DEFAULT now(),
  UNIQUE(form_id, student_id)
);
--response_answers

CREATE TABLE response_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  answer TEXT NOT NULL
);
--email_logs

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID,
  student_id UUID,
  email_type TEXT,
  status TEXT,
  sent_at TIMESTAMP DEFAULT now()
);

```
---


## env File
<ol>
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=...
</ol>
