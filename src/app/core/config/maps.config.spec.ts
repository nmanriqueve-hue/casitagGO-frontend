
import { describe, expect, it } from 'vitest';
import { MAPS_CONFIG } from './maps.config';

describe('Maps Config - CasitaGO', () => {

  it('01 - debe existir la configuración de mapas', () => {
    expect(MAPS_CONFIG).toBeDefined();
  });

  it('02 - debe ser un objeto', () => {
    expect(typeof MAPS_CONFIG).toBe('object');
    expect(MAPS_CONFIG).not.toBeNull();
  });

  it('03 - debe contener la propiedad geoapifyApiKey', () => {
    expect(MAPS_CONFIG).toHaveProperty('geoapifyApiKey');
  });

  it('04 - debe almacenar la clave como texto', () => {
    expect(typeof MAPS_CONFIG.geoapifyApiKey).toBe('string');
  });

  it('05 - debe permitir una clave vacía en la configuración actual', () => {
    expect(MAPS_CONFIG.geoapifyApiKey).toBe('');
  });

  it('06 - debe contener únicamente la propiedad configurada', () => {
    expect(Object.keys(MAPS_CONFIG)).toEqual(['geoapifyApiKey']);
  });

});
