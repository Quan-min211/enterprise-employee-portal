/**
 * Test setup: load a test .env, override DB to in-memory SQLite (if available)
 * or use a dedicated test MySQL DB.
 *
 * We use `DB_SYNC=true` and `DB_SEED=false` so we get a fresh schema each run
 * without polluting seed data.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load test env first, then fall back to root .env
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env.test') });
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });

// Override critical env vars for test isolation
process.env.NODE_ENV = 'test';
process.env.DB_SYNC = 'true';
process.env.DB_SYNC_ALTER = 'false';
process.env.DB_SEED = 'false';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-ok';
process.env.PORT = '3001';
