import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.date()
});

export type User = z.infer<typeof UserSchema>;
