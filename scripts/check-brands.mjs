/** Verify the generated brand registry resolves key technologies and aliases. */
import assert from 'node:assert/strict';
import { brandFor } from '../viewer/src/brands.tsx';

assert.equal(brandFor('Express')?.id, 'express');
assert.equal(brandFor('expressjs')?.id, 'express');
assert.equal(brandFor('Nx')?.id, 'nx');
assert.equal(brandFor('Drizzle ORM')?.id, 'drizzle-orm-icon');
assert.equal(brandFor('Prisma')?.id, 'prisma');
assert.equal(brandFor('PostgreSQL 16')?.id, 'postgresql');
assert.equal(brandFor('OpenTelemetry')?.id, 'opentelemetry-icon');
assert.equal(brandFor('unknown-stack'), null);
console.log('Brand registry checks passed (Express, Nx, Drizzle, Prisma, Postgres, OpenTelemetry)');
