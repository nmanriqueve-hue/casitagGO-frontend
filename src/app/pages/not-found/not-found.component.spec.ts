
// @vitest-environment jsdom
import '@angular/compiler';

import {
  beforeEach,
  describe,
  expect,
  it
} from 'vitest';

import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  let component: NotFoundComponent;

  beforeEach(() => {
    component = new NotFoundComponent();
  });

  describe('Creación del componente', () => {
    it('debe crear el componente correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debe ser una instancia de NotFoundComponent', () => {
      expect(component).toBeInstanceOf(NotFoundComponent);
    });

    it('debe permitir crear varias instancias', () => {
      const otroComponente = new NotFoundComponent();

      expect(otroComponente).toBeInstanceOf(NotFoundComponent);
      expect(otroComponente).not.toBe(component);
    });
  });

  describe('Definición del componente', () => {
    it('debe tener definida la clase NotFoundComponent', () => {
      expect(NotFoundComponent).toBeDefined();
    });

    it('debe ser una clase que puede instanciarse', () => {
      expect(typeof NotFoundComponent).toBe('function');
    });

    it('debe conservar el nombre de la clase', () => {
      expect(NotFoundComponent.name).toBe('NotFoundComponent');
    });

    it('debe tener un prototipo definido', () => {
      expect(NotFoundComponent.prototype).toBeDefined();
    });
  });

  describe('Comportamiento básico', () => {
    it('debe mantener la misma instancia', () => {
      const instancia = component;

      expect(component).toBe(instancia);
    });

    it('debe tener un constructor funcional', () => {
      expect(() => new NotFoundComponent()).not.toThrow();
    });

    it('debe conservar el tipo del componente', () => {
      expect(component.constructor).toBe(NotFoundComponent);
    });

    it('debe crear instancias independientes', () => {
      const primero = new NotFoundComponent();
      const segundo = new NotFoundComponent();

      expect(primero).not.toBe(segundo);
    });

    it('debe permitir crear el componente sin argumentos', () => {
      const instancia = new NotFoundComponent();

      expect(instancia).toBeTruthy();
    });
  });
});
