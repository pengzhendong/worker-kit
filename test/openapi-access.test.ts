import { expect, it } from 'vitest';
import type { OpenAPIV3_1 as O } from 'openapi-types';
import { authenticationLabel } from '../src/web/openapi-access';

const spec: O.Document = { openapi: '3.1.0', info: { title: 'fixture', version: '1' }, paths: {}, security: [{ session: [] }], components: { securitySchemes: {
  session: { type: 'apiKey', in: 'cookie', name: 'session' }, token: { type: 'http', scheme: 'bearer' }, basic: { type: 'http', scheme: 'basic' }, upload: { type: 'apiKey', in: 'header', name: 'X-Upload-Token' },
} } };
it('reads inherited authentication and explicit public overrides without assuming every scheme is a cookie', () => {
  expect(authenticationLabel(spec, {})).toBe('Cookie');
  expect(authenticationLabel(spec, { security: [] })).toBe('公开');
  expect(authenticationLabel(spec, { security: [{ session: [] }, { token: [] }] })).toBe('Cookie / Token');
  expect(authenticationLabel(spec, { security: [{ basic: [], upload: [] }] })).toBe('Basic + X-Upload-Token');
  expect(authenticationLabel(spec, { security: [{ upload: [] }, {}] })).toBe('X-Upload-Token / 公开');
  expect(authenticationLabel(spec, { security: [{ externalScheme: [] }] })).toBe('externalScheme');
  expect(authenticationLabel(spec, { 'x-authentication-label': 'UUID（密文读取）' })).toBe('UUID（密文读取）');
});
