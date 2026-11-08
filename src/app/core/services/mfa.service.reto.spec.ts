// @vitest-environment jsdom
import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { MfaService, RetoMfaRequerido } from './mfa.service';

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

describe('MfaService - reto de codigo sin error 400', () => {
  let service: MfaService;

  beforeEach(() => {
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [MfaService]
    });

    service = TestBed.inject(MfaService);
  });

  it('RetoMfaRequerido es un Error con nombre y mensaje propios', () => {
    const reto = new RetoMfaRequerido();

    expect(reto).toBeInstanceOf(Error);
    expect(reto.name).toBe('RetoMfaRequerido');
    expect(reto.message).toContain('Se requiere');
  });

  it('reconoce el aviso nuevo (200 con mfaRequerido) como peticion de codigo', () => {
    expect(service.esPeticionDeCodigo(new RetoMfaRequerido())).toBe(true);
  });

  it('sigue reconociendo el 400 antiguo del back como peticion de codigo', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: 'Se envio un codigo de verificacion a tu correo.'
    });

    expect(service.esPeticionDeCodigo(error)).toBe(true);
  });

  it('no toma un 400 con otro mensaje como peticion de codigo', () => {
    const error = new HttpErrorResponse({ status: 400, error: 'Codigo invalido o expirado.' });

    expect(service.esPeticionDeCodigo(error)).toBe(false);
  });

  it('no toma un error HTTP distinto de 400 como peticion de codigo', () => {
    const error = new HttpErrorResponse({ status: 500, error: 'Se envio un codigo' });

    expect(service.esPeticionDeCodigo(error)).toBe(false);
  });

  it('no toma un error que no es HTTP ni RetoMfaRequerido como peticion de codigo', () => {
    expect(service.esPeticionDeCodigo(new Error('otro fallo'))).toBe(false);
    expect(service.esPeticionDeCodigo('texto suelto')).toBe(false);
    expect(service.esPeticionDeCodigo(null)).toBe(false);
  });
});
