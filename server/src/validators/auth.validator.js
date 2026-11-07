import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters long' })
      .max(60, { message: 'Name cannot exceed 60 characters' }),
    email: z
      .string({ required_error: 'Email address is required' })
      .trim()
      .toLowerCase()
      .email({ message: 'Please provide a valid email address' }),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, { message: 'Password must be at least 6 characters long' })
      .max(100, { message: 'Password cannot exceed 100 characters' }),
    confirmPassword: z
      .string({ required_error: 'Confirm password is required' })
      .min(1, { message: 'Confirm password is required' }),
    phone: z.string().trim().optional().default(''),
    role: z
      .enum(['customer', 'provider'], {
        errorMap: () => ({ message: 'Public registration allows "customer" or "provider" only' }),
      })
      .default('customer'),
    businessName: z.string().trim().optional(),
    businessCategory: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Please provide a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const updateProfileSchema = z
  .object({
    name: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters long' })
      .max(60, { message: 'Name cannot exceed 60 characters' }),
    phone: z
      .string()
      .trim()
      .max(25, { message: 'Phone number cannot exceed 25 characters' })
      .optional()
      .default(''),
    avatarUrl: z
      .string()
      .trim()
      .max(500, { message: 'Avatar URL cannot exceed 500 characters' })
      .optional()
      .default(''),
    role: z.any().optional(),
    email: z.any().optional(),
    password: z.any().optional(),
    passwordHash: z.any().optional(),
    isActive: z.any().optional(),
    isEmailVerified: z.any().optional(),
    _id: z.any().optional(),
    userId: z.any().optional(),
  })
  .refine(
    (data) =>
      data.role === undefined &&
      data.email === undefined &&
      data.password === undefined &&
      data.passwordHash === undefined &&
      data.isActive === undefined &&
      data.isEmailVerified === undefined &&
      data._id === undefined &&
      data.userId === undefined,
    {
      message: 'Modifying security-critical fields (role, email, password, permissions, user ID) is not permitted.',
      path: ['role'],
    }
  );

/**
 * Reusable validation middleware
 * @param {z.ZodSchema} schema
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const issues = result.error?.issues || result.error?.errors || [];
    const formattedErrors = issues.map((err) => ({
      field: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
      message: err.message,
    }));

    const primaryMessage = formattedErrors[0]?.message || 'Validation failed';

    return res.status(400).json({
      success: false,
      error: {
        message: primaryMessage,
        statusCode: 400,
        details: formattedErrors,
      },
    });
  }

  req.body = result.data;
  next();
};

