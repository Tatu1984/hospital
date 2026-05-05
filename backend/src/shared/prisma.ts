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

// Encrypt on write, decrypt on read for Patient PHI fields. The query-level
// extension intercepts Prisma's own argument shaping so nested writes (e.g.
// `encounter.create({ data: { patient: { create: {...} } } })`) also get
// the encrypt pass.
const extended = base.$extends({
  query: {
    patient: {
      async create({ args, query }) {
        if (args.data) args.data = encryptPatientFields(args.data as any);
        return query(args);
      },
      async createMany({ args, query }) {
        if (Array.isArray(args.data)) args.data = (args.data as any[]).map(encryptPatientFields);
        else if (args.data) args.data = encryptPatientFields(args.data as any);
        return query(args);
      },
      async update({ args, query }) {
        if (args.data) args.data = encryptPatientFields(args.data as any);
        return query(args);
      },
      async updateMany({ args, query }) {
        if (args.data) args.data = encryptPatientFields(args.data as any);
        return query(args);
      },
      async upsert({ args, query }) {
        if (args.create) args.create = encryptPatientFields(args.create as any);
        if (args.update) args.update = encryptPatientFields(args.update as any);
        return query(args);
      },
    },
  },
  result: {
    patient: {
      // Compute a transparent decryption layer for each PHI field. Prisma
      // will pull the underlying ciphertext via `needs` and route the
      // computed value through `compute` whenever a Patient row is read.
      ...Object.fromEntries(
        PATIENT_ENCRYPTED_FIELDS.map((field) => [
          field,
          {
            needs: { [field]: true } as any,
            compute(row: any) {
              const v = row[field];
              if (v == null) return null;
              return decryptPatientFields({ [field]: v })[field];
            },
          },
        ]),
      ),
    },
  },
});

// Type-cast back to PrismaClient so consumers' existing typings still work.
// $extends returns a derived type with extra metadata; for pragmatic reasons
// (7000+ lines of server.ts already typed against PrismaClient) we erase it.
export const prisma = extended as unknown as PrismaClient;
export type { PrismaClient };
