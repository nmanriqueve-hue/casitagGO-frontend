import '@angular/compiler';
import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {  positiveInteger,lettersOnly, requiredText } from './form-rules';

describe('requiredText', () => {
  it('debe aceptar un texto válido', () => {
    const control = new FormControl('Bogotá');

    const resultado = requiredText()(control);

    expect(resultado).toBeNull();
  });

  it('debe rechazar un campo vacío', () => {
    const control = new FormControl('');

    const resultado = requiredText()(control);

    expect(resultado).toEqual({
      field: 'Este campo es obligatorio; no uses solo espacios.'
    });
  });

  it('debe rechazar un texto compuesto únicamente por espacios', () => {
    const control = new FormControl('     ');

    const resultado = requiredText()(control);

    expect(resultado).toEqual({
      field: 'Este campo es obligatorio; no uses solo espacios.'
    });
  });

  it('debe rechazar un texto menor que la longitud mínima indicada', () => {
    const control = new FormControl('Casa');

    const resultado = requiredText(5)(control);

    expect(resultado).toEqual({
      field: 'Escribe al menos 5 caracteres.'
    });
  });

  it('debe aceptar un texto que cumpla exactamente la longitud mínima', () => {
    const control = new FormControl('Casita');

    const resultado = requiredText(6)(control);

    expect(resultado).toBeNull();
  });
});
describe('lettersOnly', () => {
  it('debe aceptar un texto que contenga únicamente letras', () => {
    const control = new FormControl('Bogota');

    const resultado = lettersOnly(control);

    expect(resultado).toBeNull();
  });

  it('debe aceptar palabras separadas por espacios', () => {
    const control = new FormControl('San Andres');

    const resultado = lettersOnly(control);

    expect(resultado).toBeNull();
  });

  it('debe aceptar letras con tildes y caracteres propios del español', () => {
    const control = new FormControl('José Muñoz');

    const resultado = lettersOnly(control);

    expect(resultado).toBeNull();
  });

  it('debe rechazar un texto que contenga números', () => {
    const control = new FormControl('Bogota123');

    const resultado = lettersOnly(control);

    expect(resultado).toEqual({
      field: 'Escribe solo letras y espacios, sin números.'
    });
  });

  it('debe rechazar un texto compuesto únicamente por números', () => {
    const control = new FormControl('12345');

    const resultado = lettersOnly(control);

    expect(resultado).toEqual({
      field: 'Escribe solo letras y espacios, sin números.'
    });
  });

  it('debe rechazar un campo vacío', () => {
    const control = new FormControl('');

    const resultado = lettersOnly(control);

    expect(resultado).toEqual({
      field: 'Escribe solo letras y espacios, sin números.'
    });
  });
});
describe('positiveInteger', () => {
  it('debe aceptar un número entero positivo', () => {
    const control = new FormControl(5);

    const resultado = positiveInteger(control);

    expect(resultado).toBeNull();
  });

  it('debe aceptar el valor mínimo permitido de 1', () => {
    const control = new FormControl(1);

    const resultado = positiveInteger(control);

    expect(resultado).toBeNull();
  });

  it('debe rechazar el número cero', () => {
    const control = new FormControl(0);

    const resultado = positiveInteger(control);

    expect(resultado).toEqual({
      field: 'Escribe un número entero de al menos 1, sin letras.'
    });
  });

  it('debe rechazar números negativos', () => {
    const control = new FormControl(-3);

    const resultado = positiveInteger(control);

    expect(resultado).toEqual({
      field: 'Escribe un número entero de al menos 1, sin letras.'
    });
  });

  it('debe rechazar números decimales', () => {
    const control = new FormControl(2.5);

    const resultado = positiveInteger(control);

    expect(resultado).toEqual({
      field: 'Escribe un número entero de al menos 1, sin letras.'
    });
  });

  it('debe rechazar números escritos como texto', () => {
    const control = new FormControl('5');

    const resultado = positiveInteger(control);

    expect(resultado).toEqual({
      field: 'Escribe un número entero de al menos 1, sin letras.'
    });
  });

  it('debe rechazar texto que contenga letras', () => {
    const control = new FormControl('cinco');

    const resultado = positiveInteger(control);

    expect(resultado).toEqual({
      field: 'Escribe un número entero de al menos 1, sin letras.'
    });
  });
});