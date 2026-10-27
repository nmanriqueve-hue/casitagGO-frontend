// @vitest-environment jsdom
import '@angular/compiler';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogService, PublicacionBack } from './catalog.service';
import { BookingService } from './booking.service';
import { SessionService } from './session.service';

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

describe('CatalogService.desdeBack - nombre del anfitrion', () => {
  let service: CatalogService;

  const publicacion: PublicacionBack = {
    id: 'uuid-publicacion-1',
    anfitrionId: 'uuid-anfitrion-1',
    titulo: 'Apartamento de prueba',
    descripcion: 'Alojamiento para pruebas',
    ubicacionTextual: 'Calle 100',
    ciudad: 'Bogota',
    tipo: 'APARTAMENTO',
    capacidad: 4,
    precioNoche: 150000,
    estado: 'ACTIVA',
    servicios: [],
    reglas: [],
    imagenes: []
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [
        CatalogService,
        { provide: SessionService, useValue: { currentUser: signal(null), role: signal('guest') } },
        {
          provide: BookingService,
          useValue: {
            available: vi.fn().mockReturnValue(true),
            canReview: vi.fn().mockReturnValue(true),
            markReviewed: vi.fn(),
            bookings: signal([])
          }
        },
        { provide: HttpClient, useValue: { get: vi.fn().mockReturnValue(of([])) } }
      ]
    });

    service = TestBed.inject(CatalogService);
  });

  it('copia el nombre del anfitrion que manda el back', () => {
    const resultado = service.desdeBack({ ...publicacion, anfitrionNombre: 'Ana Anfitriona' });

    expect(resultado.hostName).toBe('Ana Anfitriona');
  });

  it('deja el nombre sin definir si el back manda null', () => {
    const resultado = service.desdeBack({ ...publicacion, anfitrionNombre: null });

    expect(resultado.hostName).toBeUndefined();
  });

  it('deja el nombre sin definir si el back no lo manda', () => {
    const resultado = service.desdeBack(publicacion);

    expect(resultado.hostName).toBeUndefined();
  });

  it('sigue copiando el id del anfitrion junto con el nombre', () => {
    const resultado = service.desdeBack({ ...publicacion, anfitrionNombre: 'Ana Anfitriona' });

    expect(resultado.hostUuid).toBe('uuid-anfitrion-1');
  });
});
