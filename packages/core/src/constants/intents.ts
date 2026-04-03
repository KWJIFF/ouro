export const INTENT_TYPES = ['create', 'modify', 'explore', 'capture', 'connect', 'compose'] as const;

export const INTENT_DESCRIPTIONS: Record<string, string> = {
  create: 'Make something new (code, design, document, prototype)',
  modify: 'Change something that already exists',
  explore: 'Research, compare, analyze',
  capture: 'Save this thought for later',
  connect: 'Link this idea to a previous idea',
  compose: 'Combine multiple previous ideas into something new',
};
