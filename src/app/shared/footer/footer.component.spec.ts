
 // @vitest-environment jsdom

import '@angular/compiler';

import { describe, expect, it } from 'vitest';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {

  it('debe crear el componente correctamente', () => {
    const component = new FooterComponent();

    expect(component).toBeTruthy();
  });

  it('debe ser una instancia de FooterComponent', () => {
    const component = new FooterComponent();

    expect(component).toBeInstanceOf(FooterComponent);
  });

  it('debe permitir crear varias instancias', () => {
    const primero = new FooterComponent();
    const segundo = new FooterComponent();

    expect(primero).not.toBe(segundo);
  });

  it('debe tener definido el constructor', () => {
    expect(FooterComponent).toBeDefined();
    expect(typeof FooterComponent).toBe('function');
  });

  it('debe tener un prototipo válido', () => {
    expect(FooterComponent.prototype).toBeDefined();
  });

  it('debe conservar el constructor en su prototipo', () => {
    expect(FooterComponent.prototype.constructor).toBe(
      FooterComponent
    );
  });

  it('debe tener el nombre de clase correcto', () => {
    expect(FooterComponent.name).toBe('FooterComponent');
  });

  it('debe permitir crear una instancia mediante su constructor', () => {
    const component = Reflect.construct(FooterComponent, []);

    expect(component).toBeInstanceOf(FooterComponent);
  });

  it('debe conservar su prototipo al crear una instancia', () => {
    const component = new FooterComponent();

    expect(Object.getPrototypeOf(component)).toBe(
      FooterComponent.prototype
    );
  });

  it('debe permitir crear el componente sin argumentos', () => {
    expect(() => new FooterComponent()).not.toThrow();
  });

  it('debe permitir acceder a la instancia creada', () => {
    const component = new FooterComponent();

    expect(component).not.toBeNull();
    expect(component).not.toBeUndefined();
  });

  it('debe conservar la identidad de su clase', () => {
    const component = new FooterComponent();

    expect(component.constructor.name).toBe('FooterComponent');
  });

});
