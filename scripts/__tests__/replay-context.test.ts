import { describe, test, expect } from 'vitest';
import { verifyChunkContext, computeRunTrust } from '../replay-run';
import { buildChunkText } from '../../src/evidence/production-pipeline';

const seg = (index: number, text: string) => ({ index, start: '', end: '', text });
const chunk = [seg(9, 'a'), seg(10, 'b'), seg(100, 'c')];
const chars = buildChunkText(chunk).length;
const markers = 4 + 5 + 6;

describe('verifyChunkContext', () => {
  test('identik → OK', () => {
    expect(verifyChunkContext({ chunk: 1, segments: [9, 100], chars } as any, chunk).status).toBe('OK');
  });
  test('selisih = total penanda → LEGACY_FORMAT', () => {
    expect(verifyChunkContext({ chunk: 1, segments: [9, 100], chars: chars - markers } as any, chunk).status).toBe('LEGACY_FORMAT');
  });
  test('selisih lain → CHARS_DIFF', () => {
    expect(verifyChunkContext({ chunk: 1, segments: [9, 100], chars: chars - markers - 1 } as any, chunk).status).toBe('CHARS_DIFF');
  });
  test('batas beda → BOUNDARY_DIFF', () => {
    expect(verifyChunkContext({ chunk: 1, segments: [9, 99], chars } as any, chunk).status).toBe('BOUNDARY_DIFF');
  });
  test('record tanpa segments/chars → UNKNOWN', () => {
    expect(verifyChunkContext({ chunk: 1 } as any, chunk).status).toBe('UNKNOWN');
    expect(verifyChunkContext(undefined, chunk).status).toBe('UNKNOWN');
  });
});

describe('computeRunTrust', () => {
  const base = { srtVerified: true, hasChunkConfig: true, reconstructedChunkCount: 2, recordedChunkCount: 2,
    chunkCtx: [{ chunk: 1, ctx: 'OK' as const }, { chunk: 2, ctx: 'LEGACY_FORMAT' as const }] };
  test('OK + LEGACY → VERIFIED', () => expect(computeRunTrust(base).trust).toBe('VERIFIED'));
  test('jumlah chunk beda → UNVERIFIED', () =>
    expect(computeRunTrust({ ...base, reconstructedChunkCount: 3 }).trust).toBe('UNVERIFIED'));
  test('config hilang → UNVERIFIED', () =>
    expect(computeRunTrust({ ...base, hasChunkConfig: false }).trust).toBe('UNVERIFIED'));
  test('SRT mismatch → UNVERIFIED', () =>
    expect(computeRunTrust({ ...base, srtVerified: false }).trust).toBe('UNVERIFIED'));
  test('CHARS_DIFF → UNVERIFIED', () =>
    expect(computeRunTrust({ ...base, chunkCtx: [{ chunk: 1, ctx: 'CHARS_DIFF' }] }).trust).toBe('UNVERIFIED'));
  test('raw hilang tak terduga → UNVERIFIED', () =>
    expect(computeRunTrust({ ...base, chunkCtx: [{ chunk: 1, ctx: 'OK', rawMissingUnexpected: true }] }).trust).toBe('UNVERIFIED'));
});
