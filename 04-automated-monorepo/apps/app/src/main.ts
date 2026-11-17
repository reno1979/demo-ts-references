import type { ComponentProps } from 'react';

import { UserSchema, User } from '@myrepo/validation';
import { formatDate } from '@myrepo/utils';

export type AppButtonProps = ComponentProps<'button'>;

const user: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Alex',
  email: 'alex@example.com',
  role: 'admin',
  createdAt: new Date()
};

console.log(UserSchema.parse(user), formatDate(user.createdAt));
