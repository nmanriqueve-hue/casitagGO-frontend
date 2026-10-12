
 // @vitest-environment jsdom

import '@angular/compiler';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ElementRef } from '@angular/core';
import type { Injector, Renderer2 } from '@angular/core';
import { FormControl } from '@angular/forms';

import { FieldValidationDirective } from './field-validation.directive';

describe('FieldValidationDirective', () => {
  let directive: FieldValidationDirective;
  let input: HTMLInputElement;
  let parent: HTMLDivElement;
  let control: FormControl;
  let renderer: Renderer2;
  let injector: Injector;

  function crearCampo(
    name: string,
    type = 'text',
    value: unknown = ''
  ): void {
    parent = document.createElement('div');
    input = document.createElement('input');

    input.type = type;
    input.name = name;
    input.setAttribute('formControlName', name);

    parent.appendChild(input);
    document.body.appendChild(parent);

    control = new FormControl(value);

    renderer = {
      createElement: vi.fn((tag: string) => document.createElement(tag)),

      addClass: vi.fn((element: HTMLElement, className: string) => {
        element.classList.add(className);
      }),

      setAttribute: vi.fn(
        (element: HTMLElement, name: string, value: string) => {
          element.setAttribute(name, value);
        }
      ),

      insertBefore: vi.fn(
        (node: Node, child: Node, reference: Node | null) => {
          node.insertBefore(child, reference);
        }
      ),

      setProperty: vi.fn(
        (element: HTMLElement, name: string, value: unknown) => {
          Reflect.set(element, name, value);
        }
      ),

      removeChild: vi.fn((node: Node, child: Node) => {
        node.removeChild(child);
      })
    } as unknown as Renderer2;

    injector = {
      get: vi.fn(() => ({ control }))
    } as unknown as Injector;

    directive = new FieldValidationDirective(
      new ElementRef<HTMLInputElement>(input),
      renderer,
      injector
    );
  }

  function validar(value: unknown) {
    control.setValue(value);
    return directive.validate(control);
  }

  function error(value: unknown): string | null {
    return validar(value)?.['field'] ?? null;
  }

  function mensaje(): HTMLElement | null {
    return parent.querySelector('.field-error');
  }

  function cambiarCampo(name: string, type = 'text'): void {
    directive.ngOnDestroy();
    parent.remove();
    crearCampo(name, type);
  }

  beforeEach(() => {
    crearCampo('name');
  });

  afterEach(() => {
    directive?.ngOnDestroy();
    parent?.remove();
  });

  // CREACIÓN

  it('01 - debe crear la directiva', () => {
    expect(directive).toBeTruthy();
  });

  it('02 - debe ser una instancia de FieldValidationDirective', () => {
    expect(directive).toBeInstanceOf(FieldValidationDirective);
  });

  it('03 - debe disponer del método validate', () => {
    expect(typeof directive.validate).toBe('function');
  });

  it('04 - debe disponer del método ngDoCheck', () => {
    expect(typeof directive.ngDoCheck).toBe('function');
  });

  it('05 - debe disponer del método ngOnDestroy', () => {
    expect(typeof directive.ngOnDestroy).toBe('function');
  });

  // NOMBRES Y CIUDADES

  it('06 - debe aceptar un nombre válido', () => {
    expect(validar('Nataly')).toBeNull();
  });

  it('07 - debe aceptar nombres con espacios', () => {
    expect(validar('Maria Fernanda')).toBeNull();
  });

  it('08 - debe aceptar nombres con tildes', () => {
    expect(validar('María José')).toBeNull();
  });

  it('09 - debe rechazar nombres con números', () => {
    expect(error('Nataly123')).not.toBeNull();
  });

  it('10 - debe rechazar nombres con símbolos', () => {
    expect(error('Nataly@')).not.toBeNull();
  });

  it('11 - debe rechazar espacios en blanco', () => {
    expect(error('    ')).not.toBeNull();
  });

  it('12 - debe permitir un campo de texto vacío', () => {
    expect(validar('')).toBeNull();
  });

  it('13 - debe aceptar ciudades válidas', () => {
    cambiarCampo('city');

    expect(validar('Bogotá')).toBeNull();
  });

  it('14 - debe rechazar ciudades con números', () => {
    cambiarCampo('city');

    expect(error('Bogotá123')).not.toBeNull();
  });

  // TELÉFONOS

  it('15 - debe aceptar un teléfono válido', () => {
    cambiarCampo('phone');

    expect(validar('3001234567')).toBeNull();
  });

  it('16 - debe aceptar un teléfono con indicativo', () => {
    cambiarCampo('phone');

    expect(validar('+573001234567')).toBeNull();
  });

  it('17 - debe rechazar teléfonos con letras', () => {
    cambiarCampo('phone');

    expect(error('300ABC4567')).not.toBeNull();
  });

  it('18 - debe rechazar teléfonos demasiado cortos', () => {
    cambiarCampo('phone');

    expect(error('123')).not.toBeNull();
  });

  it('19 - debe rechazar teléfonos con más de 15 dígitos', () => {
    cambiarCampo('phone');

    expect(error('1234567890123456')).not.toBeNull();
  });

  // TÍTULOS Y DESCRIPCIONES

  it('20 - debe aceptar un título válido', () => {
    cambiarCampo('title');

    expect(validar('Apartamento bonito')).toBeNull();
  });

  it('21 - debe rechazar un título corto', () => {
    cambiarCampo('title');

    expect(error('Casa')).not.toBeNull();
  });

  it('22 - debe rechazar un título formado solo por números', () => {
    cambiarCampo('title');

    expect(error('123456789')).not.toBeNull();
  });

  it('23 - debe aceptar una descripción suficientemente larga', () => {
    cambiarCampo('description');

    expect(
      validar('Apartamento cómodo y amplio cerca del centro de Bogotá.')
    ).toBeNull();
  });

  it('24 - debe rechazar una descripción corta', () => {
    cambiarCampo('description');

    expect(error('Casa bonita')).not.toBeNull();
  });

  it('25 - debe rechazar una descripción solo con números', () => {
    cambiarCampo('description');

    expect(error('123456789012345678901234567890')).not.toBeNull();
  });

  // NÚMEROS

  it('26 - debe aceptar números válidos', () => {
    cambiarCampo('price', 'number');

    expect(validar(150000)).toBeNull();
  });

  it('27 - debe rechazar un campo numérico vacío', () => {
    cambiarCampo('price', 'number');

    expect(error('')).not.toBeNull();
  });

  it('28 - debe rechazar letras en campos numéricos', () => {
    cambiarCampo('price', 'number');

    expect(error('abc')).not.toBeNull();
  });

  it('29 - debe aceptar capacidad entera positiva', () => {
    cambiarCampo('capacity', 'number');

    expect(validar(4)).toBeNull();
  });

  it('30 - debe rechazar capacidad cero', () => {
    cambiarCampo('capacity', 'number');

    expect(error(0)).not.toBeNull();
  });

  it('31 - debe rechazar capacidad negativa', () => {
    cambiarCampo('capacity', 'number');

    expect(error(-2)).not.toBeNull();
  });

  it('32 - debe rechazar capacidad decimal', () => {
    cambiarCampo('capacity', 'number');

    expect(error(2.5)).not.toBeNull();
  });

  it('33 - debe respetar el valor mínimo', () => {
    cambiarCampo('price', 'number');
    input.min = '100';

    expect(error(50)).not.toBeNull();
  });

  it('34 - debe respetar el valor máximo', () => {
    cambiarCampo('price', 'number');
    input.max = '500';

    expect(error(600)).not.toBeNull();
  });

  // IMÁGENES Y FECHAS

  it('35 - debe aceptar una URL de imagen válida', () => {
    cambiarCampo('image');

    expect(validar('https://example.com/foto.jpg')).toBeNull();
  });

  it('36 - debe rechazar una ruta de imagen inválida', () => {
    cambiarCampo('image');

    expect(error('archivo-invalido')).not.toBeNull();
  });

  it('37 - debe aceptar una fecha posterior al mínimo', () => {
    cambiarCampo('startDate', 'date');
    input.min = '2026-01-01';

    expect(validar('2026-10-12')).toBeNull();
  });

  it('38 - debe rechazar una fecha anterior al mínimo', () => {
    cambiarCampo('startDate', 'date');
    input.min = '2026-10-12';

    expect(error('2026-01-01')).not.toBeNull();
  });

  // MENSAJES VISUALES

  it('39 - debe crear un mensaje al verificar el campo', () => {
    directive.ngDoCheck();

    expect(mensaje()).not.toBeNull();
    expect(mensaje()?.classList.contains('field-error')).toBe(true);
  });

  it('40 - debe mostrar y eliminar el mensaje de error', () => {
    control.setErrors({ required: true });
    control.markAsTouched();

    directive.ngDoCheck();

    expect(mensaje()?.textContent).toBe('Este campo es obligatorio.');
    expect(mensaje()?.hidden).toBe(false);
    expect(input.getAttribute('aria-invalid')).toBe('true');

    directive.ngOnDestroy();

    expect(mensaje()).toBeNull();
  });
});
