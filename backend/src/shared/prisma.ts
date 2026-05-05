// Centralised Prisma client. Every other file should import `prisma` from
// here rather than constructing its own `new PrismaClient()` so we have:
//
//   1. One connection pool. Vercel cold starts already pay a TCP-handshake
//      cost; multiple PrismaClient instances per lambda multiply that.
//   2. One place to apply $extends — currently the transparent PHI
//      encryption layer for Patient demographics. Adding more (audit,
//      tenant scope, etc.) means editing this file, not 8 others.
//
// Behaviour-preserving for callers: the default export is still a
// PrismaClient — the extension only changes the runtime behaviour of
// Patient model writes/reads.

import { PrismaClient } from '@prisma/client';
import {
  PATIENT_ENCRYPTED_FIELDS,
  encryptPatientFields,
  decryptPatientFields,
} from './phi-encryption';

const base = new PrismaClient({
  log: process.env.PRISMA_LOG === 'true' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

// Encrypt on write, decrypt on read for Patient PHI fields. Both directions
// are implemented via the query-level extension because (a) the result-
// extension/compute path doesn't reliably override an existing column on
// Prisma 5.7 — it adds a sibling computed field but the original ciphertext
// column still serializes — and (b) doing both encrypt + decrypt in one
// place keeps the read/write symmetry obvious.
//
// Trade-off: query.findMany etc receives the full raw rows (including
// includes/selects) and we walk them post-hoc. For Patient (a hot read
// path) this is one Map.iterator per row; cheap.

function decryptResult(result: any): any {
  if (result == null) return result;
  if (Array.isArray(result)) return result.map(decryptPatientFields);
  return decryptPatientFields(result);
}

const extended = base.$extends({
  query: {
    patient: {
      // ---- writes: encrypt args.data before hitting Postgres ----
      async create({ args, query }) {
        if (args.data) args.data = encryptPatientFields(args.data as any);
        const result = await query(args);
        return decryptResult(result);
      },
      async createMany({ args, query }) {
        if (Array.isArray(args.data)) args.data = (args.data as any[]).map(encryptPatientFields);
        else if (args.data) args.data = encryptPatientFields(args.data as any);
        return query(args);
      },
      async update({ args, query }) {
        if (args.data) args.data = encryptPatientFields(args.data as any);
        const result = await query(args);
        return decryptResult(result);
      },
      async updateMany({ args, query }) {
        if (args.data) args.data = encryptPatientFields(args.data as any);
        return query(args);
      },
      async upsert({ args, query }) {
        if (args.create) args.create = encryptPatientFields(args.create as any);
        if (args.update) args.update = encryptPatientFields(args.update as any);
        const result = await query(args);
        return decryptResult(result);
      },
      // ---- reads: post-process the result through decryptPatientFields ----
      async findUnique({ args, query }) { return decryptResult(await query(args)); },
      async findUniqueOrThrow({ args, query }) { return decryptResult(await query(args)); },
      async findFirst({ args, query }) { return decryptResult(await query(args)); },
      async findFirstOrThrow({ args, query }) { return decryptResult(await query(args)); },
      async findMany({ args, query }) { return decryptResult(await query(args)); },
    },
  },
});

// Silence "unused import" warning — PATIENT_ENCRYPTED_FIELDS used to drive
// the (now removed) result-extension; the helpers above own the field list
// directly. Re-exporting keeps it discoverable for callers that want to
// know which Patient fields are encrypted (e.g. the redaction logger).
export { PATIENT_ENCRYPTED_FIELDS };

// Type-cast back to PrismaClient so consumers' existing typings still work.
// $extends returns a derived type with extra metadata; for pragmatic reasons
// (7000+ lines of server.ts already typed against PrismaClient) we erase it.
export const prisma = extended as unknown as PrismaClient;
export type { PrismaClient };
