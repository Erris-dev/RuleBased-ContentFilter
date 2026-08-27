/** Central place for anything environment-dependent. */

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const config = {
  port: toInt(process.env.PORT, 3001),

  /**
   * Vite's dev server. Listed explicitly rather than allowing all origins so the
   * permissive setting is a deliberate, visible choice.
   */
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  /** Path is resolved relative to the server workspace root by db.ts. */
  databaseFile: process.env.DATABASE_FILE ?? 'data/rules.db',

  isProduction: process.env.NODE_ENV === 'production',
} as const;
