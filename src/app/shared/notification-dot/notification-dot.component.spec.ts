// @vitest-environment jsdom
import '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { NotificationDotComponent } from './notification-dot.component';
import { EventosService } from '../../core/services/eventos.service';
import { NotificacionesBackService } from '../../core/services/notificaciones-back.service';

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

describe('NotificationDotComponent', () => {
  let instanciasDeEventos: number;

  const crearComponente = (noLeidas: number): NotificationDotComponent => {
    TestBed.configureTestingModule({
      providers: [
        { provide: NotificacionesBackService, useValue: { noLeidas: () => noLeidas } },
        {
          provide: EventosService,
          useFactory: () => {
            instanciasDeEventos++;
            return {};
          }
        }
      ]
    });

    return TestBed.runInInjectionContext(() => new NotificationDotComponent());
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    instanciasDeEventos = 0;
  });

  it('muestra la cantidad exacta cuando hay pocas notificaciones', () => {
    expect(crearComponente(3).cantidad()).toBe('3');
  });

  it('muestra 9 tal cual', () => {
    expect(crearComponente(9).cantidad()).toBe('9');
  });

  it('muestra 9+ cuando hay mas de nueve', () => {
    expect(crearComponente(10).cantidad()).toBe('9+');
  });

  it('la etiqueta de accesibilidad usa singular con una sola notificacion', () => {
    expect(crearComponente(1).etiqueta()).toBe('1 notificación sin leer');
  });

  it('la etiqueta de accesibilidad usa plural con varias notificaciones', () => {
    expect(crearComponente(4).etiqueta()).toBe('4 notificaciones sin leer');
  });

  it('activa el canal en vivo al crearse', () => {
    crearComponente(0);

    expect(instanciasDeEventos).toBe(1);
  });
});
