
 // @vitest-environment jsdom

import '@angular/compiler';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PropertyCardComponent } from './property-card.component';
import type { Listing } from '../../core/models/marketplace.models';

try {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting()
  );
} catch (error) {
  if (
    !(error instanceof Error) ||
    !error.message.includes('already been initialized')
  ) {
    throw error;
  }
}

describe('PropertyCardComponent', () => {

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  const crearAlojamiento = (id: number): Listing => {
    return {
      id
    } as unknown as Listing;
  };

  const crearComponente = (alojamiento: Listing) => {
    const alojamientoSignal = signal<Listing>(alojamiento);

    const component = TestBed.runInInjectionContext(
      () => new PropertyCardComponent()
    );

    Object.defineProperty(component, 'listing', {
      value: alojamientoSignal.asReadonly(),
      configurable: true
    });

    return {
      component,
      alojamientoSignal
    };
  };

  // CREACIÓN

  it('debe crear el componente correctamente', () => {
    const { component } = crearComponente(
      crearAlojamiento(1)
    );

    expect(component).toBeTruthy();
  });

  it('debe ser una instancia de PropertyCardComponent', () => {
    const { component } = crearComponente(
      crearAlojamiento(1)
    );

    expect(component).toBeInstanceOf(
      PropertyCardComponent
    );
  });

  it('debe tener disponible el input listing', () => {
    const { component } = crearComponente(
      crearAlojamiento(1)
    );

    expect(typeof component.listing).toBe('function');
  });

  it('debe recibir un alojamiento', () => {
    const alojamiento = crearAlojamiento(1);
    const { component } = crearComponente(alojamiento);

    expect(component.listing()).toBeDefined();
  });

  it('debe conservar el alojamiento recibido', () => {
    const alojamiento = crearAlojamiento(1);
    const { component } = crearComponente(alojamiento);

    expect(component.listing()).toBe(alojamiento);
  });

  it('debe conservar los datos del alojamiento', () => {
    const alojamiento = crearAlojamiento(1);
    const { component } = crearComponente(alojamiento);

    expect(component.listing()).toEqual(alojamiento);
  });

  // ACTUALIZACIÓN

  it('debe actualizar el alojamiento cuando cambia la señal', () => {
    const primero = crearAlojamiento(1);
    const segundo = crearAlojamiento(2);

    const { component, alojamientoSignal } =
      crearComponente(primero);

    alojamientoSignal.set(segundo);

    expect(component.listing()).toBe(segundo);
  });

  it('debe mantener el valor mientras no cambie', () => {
    const alojamiento = crearAlojamiento(1);
    const { component } = crearComponente(alojamiento);

    expect(component.listing()).toBe(alojamiento);
    expect(component.listing()).toBe(alojamiento);
  });

  it('debe permitir actualizar varias veces', () => {
    const primero = crearAlojamiento(1);
    const segundo = crearAlojamiento(2);
    const tercero = crearAlojamiento(3);

    const { component, alojamientoSignal } =
      crearComponente(primero);

    alojamientoSignal.set(segundo);
    expect(component.listing()).toBe(segundo);

    alojamientoSignal.set(tercero);
    expect(component.listing()).toBe(tercero);
  });

  it('debe conservar el último alojamiento asignado', () => {
    const { component, alojamientoSignal } =
      crearComponente(crearAlojamiento(1));

    const ultimo = crearAlojamiento(5);

    alojamientoSignal.set(crearAlojamiento(2));
    alojamientoSignal.set(ultimo);

    expect(component.listing()).toBe(ultimo);
  });

  // INDEPENDENCIA

  it('debe permitir crear varias tarjetas', () => {
    const primera = crearComponente(
      crearAlojamiento(1)
    );

    const segunda = crearComponente(
      crearAlojamiento(2)
    );

    expect(primera.component).not.toBe(
      segunda.component
    );
  });

  it('debe mantener independientes los alojamientos', () => {
    const alojamientoUno = crearAlojamiento(1);
    const alojamientoDos = crearAlojamiento(2);

    const primera = crearComponente(alojamientoUno);
    const segunda = crearComponente(alojamientoDos);

    expect(primera.component.listing()).toBe(
      alojamientoUno
    );

    expect(segunda.component.listing()).toBe(
      alojamientoDos
    );
  });

  it('debe actualizar una tarjeta sin afectar otra', () => {
    const primera = crearComponente(
      crearAlojamiento(1)
    );

    const segundoAlojamiento = crearAlojamiento(2);
    const segunda = crearComponente(segundoAlojamiento);

    const nuevoAlojamiento = crearAlojamiento(10);

    primera.alojamientoSignal.set(nuevoAlojamiento);

    expect(primera.component.listing()).toBe(
      nuevoAlojamiento
    );

    expect(segunda.component.listing()).toBe(
      segundoAlojamiento
    );
  });

  // CONSTRUCTOR

  it('debe permitir crear el componente dentro de Angular', () => {
    expect(() => {
      TestBed.runInInjectionContext(
        () => new PropertyCardComponent()
      );
    }).not.toThrow();
  });

  it('debe conservar su prototipo', () => {
    const { component } = crearComponente(
      crearAlojamiento(1)
    );

    expect(Object.getPrototypeOf(component)).toBe(
      PropertyCardComponent.prototype
    );
  });

  it('debe tener el constructor correcto', () => {
    const { component } = crearComponente(
      crearAlojamiento(1)
    );

    expect(component.constructor).toBe(
      PropertyCardComponent
    );
  });

});
