
import { describe, expect, it } from 'vitest';
import { API_URL } from './api.config';

describe('API Config - CasitaGO', () => {

  it('01 - debe existir la URL de la API', () => {
    expect(API_URL).toBeDefined();
  });

  it('02 - debe ser una cadena de texto', () => {
    expect(typeof API_URL).toBe('string');
  });

  it('03 - no debe estar vacía', () => {
    expect(API_URL.trim().length).toBeGreaterThan(0);
  });

  it('04 - debe tener un protocolo HTTP válido', () => {
    expect(API_URL).toMatch(/^https?:\/\//);
  });

  it('05 - debe apuntar al servidor local configurado', () => {
    expect(API_URL).toBe('http://localhost:8080');
  });

  it('06 - debe utilizar el puerto 8080', () => {
    const url = new URL(API_URL);
    expect(url.port).toBe('8080');
  });

});
