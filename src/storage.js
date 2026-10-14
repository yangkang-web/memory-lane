import { z } from 'zod';
const KEY = 'memory-realm:six-o-clock:v1';
export const SaveSchema = z.object({
  worldId: z.literal('six-o-clock-garden-v1').default('six-o-clock-garden-v1'),
  visited: z.array(z.enum(['seat', 'time', 'tea'])).default([]),
  favorites: z.array(z.enum(['seat', 'time', 'tea'])).default([]),
  lastNode: z.enum(['seat', 'time', 'tea']).nullable().default(null),
  sound: z.boolean().default(true),
  quality: z.enum(['auto', 'high', 'balanced']).default('auto'),
  updatedAt: z.string().default(''),
});
export function loadSave(storage = localStorage) {
  try {
    const parsed = SaveSchema.safeParse(JSON.parse(storage.getItem(KEY) || '{}'));
    return { data: parsed.success ? parsed.data : SaveSchema.parse({}), available: true };
  } catch {
    return { data: SaveSchema.parse({}), available: false };
  }
}
export function writeSave(data, storage = localStorage) {
  try {
    storage.setItem(KEY, JSON.stringify(SaveSchema.parse({ ...data, updatedAt: new Date().toISOString() })));
    return true;
  } catch { return false; }
}
