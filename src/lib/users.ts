// In-memory user store (for demo purposes — users reset on serverless cold starts)
// Replace with Supabase or external DB when available
import bcrypt from 'bcryptjs';

interface User {
  email: string;
  passwordHash: string;
  createdAt: string;
}

const users = new Map<string, User>();

export function findUser(email: string): User | undefined {
  return users.get(email.toLowerCase());
}

export function createUser(email: string, password: string): User {
  const passwordHash = bcrypt.hashSync(password, 10);
  const user: User = {
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.set(email.toLowerCase(), user);
  return user;
}

export function validatePassword(user: User, password: string): boolean {
  return bcrypt.compareSync(password, user.passwordHash);
}

export function userExists(email: string): boolean {
  return users.has(email.toLowerCase());
}
