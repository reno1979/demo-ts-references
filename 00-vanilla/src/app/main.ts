import { UserTypeGuard, User } from '@myrepo/validation';
import { formatDate } from '@myrepo/utils';

export type AppButtonProps = {
  label: string;
  onClick: () => void;
};

const user: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Alex',
  email: 'alex@example.com',
  role: 'admin',
  createdAt: new Date()
};

console.log(UserTypeGuard(user), formatDate(user.createdAt));
