
export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
}

export const UserTypeGuard = (obj: any): obj is User => (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.email === 'string' &&
    (obj.role === 'admin' || obj.role === 'user' || obj.role === 'guest') &&
    obj.createdAt instanceof Date
  );