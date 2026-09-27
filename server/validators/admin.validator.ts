import { z } from 'zod';

export const AdminLoginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(100, 'Username too long'),
  password: z.string().min(1, 'Password is required').max(200, 'Password too long'),
});

export const AdminLeadsQuerySchema = z
  .object({
    range: z.enum(['today', 'yesterday', '7days', '1month', 'all', 'custom']).default('all'),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid startDate format (YYYY-MM-DD)')
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid endDate format (YYYY-MM-DD)')
      .optional(),
    pythonStartingPoint: z.enum(['all', 'new', 'basics', 'practice']).default('all'),
    attributionStatus: z.enum(['all', 'linked', 'unlinked']).default('all'),
    search: z
      .string()
      .trim()
      .max(100, 'Search query must be at most 100 characters')
      .optional(),
    page: z
      .string()
      .regex(/^\d+$/, 'Page must be a number')
      .default('1')
      .transform(Number)
      .refine((val) => val >= 1, 'Page must be at least 1'),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a number')
      .default('10')
      .transform(Number)
      .refine((val) => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
  })
  .refine(
    (data) => {
      if (data.range === 'custom') {
        return !!data.startDate && !!data.endDate;
      }
      return true;
    },
    {
      message: "startDate and endDate are required when range is 'custom'",
      path: ['range'],
    }
  );

export const ObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid record ID format');

/**
 * Escapes regex special characters to prevent regex injection
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
