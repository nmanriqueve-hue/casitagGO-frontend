import { describe, expect, it } from 'vitest';
import { API_URL } from './api.config.production';

describe('API Config de producción - CasitaGO', () => {

  it('01 - debe usar HTTPS', () => {
    expect(API_URL).toMatch(/^https:\/\//);
  });

  it('02 - no debe apuntar a localhost', () => {
    expect(API_URL).not.toContain('localhost');
  });

  it('03 - no debe terminar en "/" (las rutas ya empiezan con "/api")', () => {
    expect(API_URL.endsWith('/')).toBe(false);
  });

});
