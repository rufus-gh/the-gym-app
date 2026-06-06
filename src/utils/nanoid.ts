import { nanoid as _nanoid } from 'nanoid/non-secure';

export function generateId(): string {
  return _nanoid();
}
