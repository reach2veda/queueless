import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createBusinessSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(['clinic', 'salon', 'bank', 'service_center', 'administrative', 'other']),
  description: z.string().trim().max(1000).optional().default(''),
  contactPhone: z.string().trim().optional().default(''),
  contactEmail: z.string().trim().email().optional().or(z.literal('')),
  address: z
    .object({
      street: z.string().trim().optional().default(''),
      city: z.string().trim().optional().default(''),
      state: z.string().trim().optional().default(''),
      postalCode: z.string().trim().optional().default(''),
      country: z.string().trim().optional().default('US'),
    })
    .optional(),
  timezone: z.string().trim().optional().default('UTC'),
});

export const updateBusinessSchema = createBusinessSchema.partial();

export const createServiceSchema = z.object({
  businessId: z.string().optional(),
  name: z
    .string({ required_error: 'Service name is required' })
    .trim()
    .min(2, 'Service name must be at least 2 characters')
    .max(100, 'Service name cannot exceed 100 characters'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().default(''),
  durationMinutes: z
    .number({ required_error: 'Duration in minutes is required' })
    .int('Duration must be a whole number')
    .min(5, 'Duration must be at least 5 minutes')
    .max(480, 'Duration cannot exceed 480 minutes (8 hours)')
    .default(30),
  price: z.number().min(0, 'Price cannot be negative').optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateServiceSchema = z.object({
  name: z.string().trim().min(2, 'Service name must be at least 2 characters').max(100, 'Service name cannot exceed 100 characters').optional(),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
  durationMinutes: z.number().int('Duration must be an integer').min(5, 'Duration must be at least 5 minutes').max(480, 'Duration cannot exceed 480 minutes').optional(),
  price: z.number().min(0, 'Price cannot be negative').optional(),
  isActive: z.boolean().optional(),
});

export const addStaffSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  email: z.string().trim().email('Valid staff email is required'),
  name: z.string().trim().min(2, 'Staff name must be at least 2 characters'),
  title: z.string().trim().max(80).optional().default('Staff Member'),
  serviceIds: z.array(z.string()).optional().default([]),
  temporaryPassword: z.string().min(6).optional().default('QueueLessStaff123!'),
});

export const updateStaffSchema = z.object({
  title: z.string().trim().max(80).optional(),
  serviceIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const setWorkingHoursSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  staffId: z.string().nullable().optional().default(null),
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      isOpen: z.boolean().default(true),
      openTime: z.string().regex(timeRegex, 'Format must be HH:mm (e.g. 09:00)').default('09:00'),
      closeTime: z.string().regex(timeRegex, 'Format must be HH:mm (e.g. 17:00)').default('17:00'),
      breakStartTime: z.string().regex(timeRegex, 'Format must be HH:mm').nullable().optional().default(null),
      breakEndTime: z.string().regex(timeRegex, 'Format must be HH:mm').nullable().optional().default(null),
    })
  ),
});

