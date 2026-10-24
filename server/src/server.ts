import { buildApp } from './app.js';
import { initializeDatabase } from './db/database.js';
import { seedDatabase } from './db/seed/seed.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // 1. Initialize SQLite Database Schema
    initializeDatabase();

    // 2. Seed initial data (7 batches, 4 users, 4 dispatches, alerts)
    seedDatabase();

    // 3. Build & start Fastify API server
    const app = await buildApp();
    await app.listen({ port: PORT, host: HOST });
    console.log(`✓ BhandarSetu Fastify Backend running on http://${HOST}:${PORT}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

