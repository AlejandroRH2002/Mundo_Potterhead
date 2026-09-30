import { PrismaClient } from '@prisma/client';
import { readConfig, readBootstrap } from '../config.ts';
import { bootstrapAdmin } from '../repositories/auth.ts';
const config = readConfig(process.env);
const credentials = readBootstrap(process.env);
const db = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
try { await bootstrapAdmin(db, credentials.email, credentials.password); console.log('Bootstrap completed; existing administrator credentials unchanged.'); }
catch { console.error('Bootstrap failed. Check configuration, migration status and account conflicts.'); process.exitCode = 1; }
finally { await db.$disconnect(); }
