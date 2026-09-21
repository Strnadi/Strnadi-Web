import { describe, expect, it } from 'vitest';
import { md5Hex } from './md5';

describe('md5Hex', () => {
  it('matches the RFC 1321 test vectors, hex-uppercase like Convert.ToHexString', () => {
    expect(md5Hex('')).toBe('D41D8CD98F00B204E9800998ECF8427E');
    expect(md5Hex('a')).toBe('0CC175B9C0F1B6A831C399E269772661');
    expect(md5Hex('abc')).toBe('900150983CD24FB0D6963F7D28E17F72');
    expect(md5Hex('message digest')).toBe('F96B697D7CB7938D525A2F31AAF161D0');
    expect(
      md5Hex('abcdefghijklmnopqrstuvwxyz')
    ).toBe('C3FCD3D76192E4007DFB496CCA67E13B');
    expect(
      md5Hex(
        '12345678901234567890123456789012345678901234567890123456789012345678901234567890'
      )
    ).toBe('57EDF4A22BE3C955AC49DA2E2107B67A');
  });

  it('hashes multi-byte text as UTF-8, the way Encoding.UTF8 does', () => {
    expect(md5Hex('č')).toBe('AEDF5025ED111CB843D8F4BEC6DA22F0');
    expect(md5Hex('žluťoučký')).toBe('4156E2177319474BAB1FC1F1733DAB51');
  });

  it('crosses the 64-byte block boundary correctly', () => {
    expect(md5Hex('a'.repeat(64))).toBe('014842D480B571495A4A0363793F7367');
    expect(md5Hex('a'.repeat(119))).toBe('8A7BD0732ED6A28CE75F6DABC90E1613');
  });
});
