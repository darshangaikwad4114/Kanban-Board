import dotenv from 'dotenv';
dotenv.config();

const DEFAULT_JWT_SECRET = 'dev-jwt-secret-change-in-production';
const DEFAULT_JWT_REFRESH_SECRET = 'dev-refresh-secret-change-in-production';

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/kanban',
  JWT_SECRET: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || DEFAULT_JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

/**
 * Refuses to boot in production with the checked-in default secrets, so a
 * misconfigured deployment fails loudly instead of running with a known,
 * publicly-visible JWT secret.
 */
export const assertProductionSecrets = (): void => {
  if (env.NODE_ENV !== 'production') return;

  const usingDefaults =
    env.JWT_SECRET === DEFAULT_JWT_SECRET || env.JWT_REFRESH_SECRET === DEFAULT_JWT_REFRESH_SECRET;

  if (usingDefaults) {
    throw new Error(
      'Refusing to start in production with default JWT secrets. Set JWT_SECRET and JWT_REFRESH_SECRET.'
    );
  }
};
