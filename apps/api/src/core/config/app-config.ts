import { Env } from './env.schema';

/**
 * Configuração tipada, injetável em qualquer provider:
 *   constructor(private readonly config: AppConfig) {}
 */
export class AppConfig {
  constructor(private readonly env: Env) {}

  get nodeEnv() {
    return this.env.NODE_ENV;
  }
  get isProduction() {
    return this.env.NODE_ENV === 'production';
  }
  get port() {
    return this.env.API_PORT;
  }
  get databaseUrl() {
    return this.env.DATABASE_URL;
  }
  get corsOrigin() {
    return this.env.CORS_ORIGIN;
  }
  get jwt() {
    return {
      accessSecret: this.env.JWT_ACCESS_SECRET,
      refreshSecret: this.env.JWT_REFRESH_SECRET,
      accessTtl: this.env.JWT_ACCESS_TTL,
      refreshTtl: this.env.JWT_REFRESH_TTL,
    };
  }
}
