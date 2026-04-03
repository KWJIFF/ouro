export const now = (): string => new Date().toISOString();
export const elapsed = (start: string): number => Date.now() - new Date(start).getTime();
