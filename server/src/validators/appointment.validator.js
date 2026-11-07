import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createAppointmentSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  serviceId: z.string().min(1, 'Service ID is required'),
  staffId: z.string().nullable().optional().default(null),
  appointmentDate: z.string().regex(dateRegex, 'Date must be formatted as YYYY-MM-DD'),
  startTime: z.string().regex(timeRegex, 'Start time must be formatted as HH:mm'),
  notes: z.string().trim().max(500).optional().default(''),
  idempotencyKey: z.string().trim().optional(),
});

export const rescheduleAppointmentSchema = z.object({
  newDate: z.string().regex(dateRegex, 'New date must be formatted as YYYY-MM-DD'),
  newStartTime: z.string().regex(timeRegex, 'New start time must be formatted as HH:mm'),
});

export const cancelAppointmentSchema = z.object({
  cancellationReason: z.string().trim().max(300).optional().default('Customer requested cancellation'),
});

