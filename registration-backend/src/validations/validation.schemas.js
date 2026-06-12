const { z } = require('zod');

const register = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address')
      .endsWith('@kongu.edu', 'Only @kongu.edu emails are allowed')
      .regex(/^.+\.\d{2}[a-z]+@kongu\.edu$/i, 'Email must be in student format: name.yeardept@kongu.edu (e.g. john.23cse@kongu.edu)'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
  })
});

const login = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required')
  })
});

const forgotPassword = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address')
  })
});

const resetPassword = z.object({
  body: z.object({
    token: z
      .string({ required_error: 'Token is required' })
      .trim()
      .min(1, 'Token is required'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
  })
});

const updateProfile = z.object({
  body: z.object({
    gender: z.enum(['BOY', 'GIRL'], {
      errorMap: () => ({ message: 'Gender must be BOY or GIRL' })
    }),
    residence_type: z.enum(['HOSTELLER', 'DAY_SCHOLAR'], {
      errorMap: () => ({ message: 'Residence type must be HOSTELLER or DAY_SCHOLAR' })
    })
  })
});

const createForm = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title is required'),
    description: z.string().optional().nullable(),
    test_date: z.string().optional().nullable()
  })
});

const addQuestion = z.object({
  body: z.object({
    question_text: z
      .string({ required_error: 'Question text is required' })
      .trim()
      .min(1, 'Question text is required'),
    input_type: z.string({ required_error: 'Input type is required' }).trim(),
    is_required: z.boolean().optional().default(true)
  })
});

const addSlot = z.object({
  body: z.object({
    slot_date: z
      .string({ required_error: 'Slot date is required' })
      .trim()
      .min(1, 'Slot date is required'),
    start_time: z
      .string({ required_error: 'Start time is required' })
      .trim()
      .min(1, 'Start time is required'),
    end_time: z
      .string({ required_error: 'End time is required' })
      .trim()
      .min(1, 'End time is required'),
    max_capacity: z
      .number({ required_error: 'Max capacity is required' })
      .int()
      .positive('Max capacity must be greater than 0'),
    gender: z.enum(['BOY', 'GIRL']).optional().nullable(),
    residence_type: z.enum(['HOSTELLER', 'DAY_SCHOLAR']).optional().nullable()
  })
});

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  updateProfile,
  createForm,
  addQuestion,
  addSlot
};
