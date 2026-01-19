import { z } from 'zod';

// Custom validation functions
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const bloodGroupRegex = /^(A|B|AB|O)[+-]?$/i;

// Date validation helpers
const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

const isFutureDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  return date > now;
};

const isPastDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  return date < now;
};

// Custom validators
const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const PatientSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(val => val.trim()),

  phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be less than 15 digits')
    .regex(phoneRegex, 'Please enter a valid phone number'),

  age: z.number()
    .int('Age must be a whole number')
    .min(0, 'Age cannot be negative')
    .max(150, 'Age must be less than 150')
    .or(z.string().regex(/^\d+$/).transform(val => parseInt(val, 10))),

  gender: z.enum(['Male', 'Female', 'Other'], {
    message: 'Please select a valid gender'
  }),

  doctortype: z.enum(['GP', 'GYNO'], {
    message: 'Please select a valid doctor type'
  }),

  photo_url: z.string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),

  lmpDate: z.string()
    .optional()
    .refine(val => !val || isValidDate(val), 'Please enter a valid date')
    .refine(val => !val || isPastDate(val), 'LMP date cannot be in the future'),

  gravida: z.number()
    .int('Gravida must be a whole number')
    .min(0, 'Gravida cannot be negative')
    .max(20, 'Please enter a realistic number')
    .optional(),

  para: z.number()
    .int('Para must be a whole number')
    .min(0, 'Para cannot be negative')
    .max(20, 'Please enter a realistic number')
    .optional(),

  address: z.string()
    .max(500, 'Address must be less than 500 characters')
    .optional(),

  allergies: z.string()
    .max(500, 'Allergies must be less than 500 characters')
    .optional(),

  bloodgroup: z.string()
    .max(10, 'Blood group must be less than 10 characters')
    .refine(val => !val || validBloodGroups.includes(val.toUpperCase()), 'Please enter a valid blood group (e.g., A+, B-, O+)')
    .optional(),

  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
});

export const VisitSchema = z.discriminatedUnion('visitMode', [
  z.object({
    visitMode: z.literal('quick'),
    patient_id: z.string().min(1, 'Patient ID is required'),
    doctortype: z.enum(['GP', 'GYNO']),
    note: z.string().min(1, 'Clinical notes are required').max(1000, 'Note must be less than 1000 characters'),
    fee: z.number().min(0, 'Fee must be a positive number').max(100000, 'Fee must be less than 100,000'),
    nextVisit: z.string().optional(),
    photo_url: z.string().url().optional(),
  }),
  z.object({
    visitMode: z.literal('photo'),
    patient_id: z.string().min(1, 'Patient ID is required'),
    doctortype: z.enum(['GP', 'GYNO']),
    note: z.string().max(1000, 'Note must be less than 1000 characters').optional(),
    fee: z.number().min(0).max(100000, 'Fee must be less than 100,000').optional(),
    nextVisit: z.string().optional(),
    photo_url: z.string().url(),
  }),
]);

export const ExpenseSchema = z.object({
  amount: z.number()
    .min(0.01, 'Amount must be greater than 0')
    .max(1000000, 'Amount must be less than 1,000,000')
    .refine(val => Number(val.toFixed(2)) === val, 'Amount can have at most 2 decimal places'),

  category: z.string()
    .min(1, 'Category is required')
    .max(100, 'Category must be less than 100 characters')
    .regex(/^[a-zA-Z\s\-&]+$/, 'Category can only contain letters, spaces, hyphens, and ampersands'),

  note: z.string()
    .max(500, 'Note must be less than 500 characters')
    .optional(),

  date: z.string()
    .min(1, 'Date is required')
    .refine(isValidDate, 'Please enter a valid date')
    .refine(val => !isFutureDate(val), 'Expense date cannot be in the future'),

  doctortype: z.enum(['GP', 'GYNO'], {
    message: 'Please select a valid doctor type'
  }),
});

// Additional validation schemas
export const ClinicSchema = z.object({
  name: z.string()
    .min(1, 'Clinic name is required')
    .max(100, 'Clinic name must be less than 100 characters'),

  address: z.string()
    .max(500, 'Address must be less than 500 characters')
    .optional(),

  phone: z.string()
    .regex(phoneRegex, 'Please enter a valid phone number')
    .optional(),
});

export const UserProfileSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),

  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),

  phone: z.string()
    .regex(phoneRegex, 'Please enter a valid phone number')
    .optional(),

  role: z.enum(['admin', 'doctor', 'receptionist'], {
    message: 'Please select a valid role'
  }),

  specialization: z.string()
    .max(100, 'Specialization must be less than 100 characters')
    .optional(),
});

export const AppointmentSchema = z.object({
  patient_id: z.string()
    .min(1, 'Patient is required')
    .uuid('Invalid patient ID'),

  start_time: z.string()
    .min(1, 'Start time is required')
    .refine(isValidDate, 'Please enter a valid start time')
    .refine(val => !isPastDate(val), 'Appointment cannot be in the past'),

  end_time: z.string()
    .min(1, 'End time is required')
    .refine(isValidDate, 'Please enter a valid end time'),

  status: z.enum(['scheduled', 'completed', 'cancelled'], {
    message: 'Please select a valid status'
  }),

  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),

  assigned_to: z.string()
    .uuid('Invalid user ID')
    .optional(),
}).refine(data => new Date(data.end_time) > new Date(data.start_time), {
  message: 'End time must be after start time',
  path: ['end_time']
});

export const PrescriptionTemplateSchema = z.object({
  name: z.string()
    .min(1, 'Template name is required')
    .max(100, 'Template name must be less than 100 characters'),

  content: z.string()
    .min(1, 'Template content is required')
    .max(5000, 'Template content must be less than 5000 characters'),
});

// Form validation utilities
export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
} => {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.issues.forEach(err => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Validation failed' } };
  }
};

export const getFieldError = (errors: Record<string, string> | undefined, field: string): string | undefined => {
  return errors?.[field];
};

export const hasFieldError = (errors: Record<string, string> | undefined, field: string): boolean => {
  return !!getFieldError(errors, field);
};

// Real-time validation helpers
export const validateField = <T>(
  schema: z.ZodSchema<T>,
  field: string,
  value: unknown
): string | null => {
  try {
    // Create a partial schema for the field
    const fieldSchema = (schema as any)._def.shape()[field];
    if (fieldSchema) {
      fieldSchema.parse(value);
      return null;
    }
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || 'Invalid value';
    }
    return 'Invalid value';
  }
};

export type PatientFormData = z.infer<typeof PatientSchema>;
export type VisitFormData = z.infer<typeof VisitSchema>;
export type ExpenseFormData = z.infer<typeof ExpenseSchema>;
export type ClinicFormData = z.infer<typeof ClinicSchema>;
export type UserProfileFormData = z.infer<typeof UserProfileSchema>;
export type AppointmentFormData = z.infer<typeof AppointmentSchema>;
export type PrescriptionTemplateFormData = z.infer<typeof PrescriptionTemplateSchema>;