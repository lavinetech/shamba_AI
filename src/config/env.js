import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
  inferenceKey: process.env.DO_INFERENCE_KEY || '',
  inferenceBaseUrl: process.env.DO_INFERENCE_BASE_URL || 'https://inference.do-ai.run',
  inferenceModel: process.env.DO_INFERENCE_MODEL || '',
  weatherApiKey: process.env.WEATHER_API_KEY || '',
  weatherBaseUrl: process.env.WEATHER_API_BASE_URL || 'https://api.openweathermap.org/data/2.5',
  uploadDir: process.env.UPLOAD_DIR || './uploads'
};

export function assertProductionConfig() {
  if (env.nodeEnv === 'production' && (!env.databaseUrl || !env.jwtSecret)) {
    throw new Error('DATABASE_URL and JWT_SECRET are required in production');
  }
}
