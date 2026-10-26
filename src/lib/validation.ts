import { z } from 'zod';
import { BOARD_COLORS, CARD_PRIORITIES } from '@/types/domain';
import { parseDateOnly, toDateOnly } from '@/lib/dates';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(254, 'Email is too long.')
  .email('Enter a valid email address.')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Password must be 72 characters or fewer.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Your name is required.')
      .max(100, 'Name must be 100 characters or fewer.'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Your name is required.')
    .max(100, 'Name must be 100 characters or fewer.'),
});

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format.')
  .refine((value) => {
    const parsed = parseDateOnly(value);
    return parsed !== null && toDateOnly(parsed) === value;
  }, 'Enter a valid date.');

export const boardSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Board name is required.')
    .max(200, 'Board name must be 200 characters or fewer.'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer.')
    .default(''),
  color: z.enum(BOARD_COLORS).default('lavender'),
  templateId: z.string().trim().min(1, 'Choose a template.').max(50).default('blank'),
});

export const boardUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Board name is required.')
    .max(200, 'Board name must be 200 characters or fewer.'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer.')
    .default(''),
  color: z.enum(BOARD_COLORS),
});

export const listTitleSchema = z
  .string()
  .trim()
  .min(1, 'List name is required.')
  .max(200, 'List name must be 200 characters or fewer.');

export const cardTitleSchema = z
  .string()
  .trim()
  .min(1, 'Card title is required.')
  .max(500, 'Card title must be 500 characters or fewer.');

export const cardPatchSchema = z
  .object({
    title: cardTitleSchema.optional(),
    description: z
      .string()
      .max(5000, 'Description must be 5000 characters or fewer.')
      .optional(),
    priority: z.enum(CARD_PRIORITIES).optional(),
    dueDate: dateOnlySchema.nullable().optional(),
    label: z.string().trim().max(50, 'Label must be 50 characters or fewer.').nullable().optional(),
    assigneeId: z.string().uuid('Choose a valid member.').nullable().optional(),
    listId: z.string().uuid('Choose a valid list.').optional(),
  })
  .refine((values) => Object.keys(values).length > 0, {
    message: 'There is nothing to update.',
  });

export const inviteSchema = z.object({ email: emailSchema });

export const uuidSchema = z.string().uuid('That identifier is invalid.');

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type BoardInput = z.infer<typeof boardSchema>;
export type BoardUpdateInput = z.infer<typeof boardUpdateSchema>;
export type CardPatchInput = z.infer<typeof cardPatchSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
