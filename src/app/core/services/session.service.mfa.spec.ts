// @vitest-environment jsdom
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { SessionService } from './session.service';
import { RetoMfaRequerido } from './mfa.service';

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

describe('SessionService - login cuando el back pide el codigo MFA', () => {
  let service: SessionService;
  const post = vi.fn();

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: HttpClient, useValue: { post } }
      ]
    });

    service = TestBed.inject(SessionService);
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('lanza RetoMfaRequerido cuando el back responde con mfaRequerido', () => {
    post.mockReturnValue(of({ mfaRequerido: true }));
    const alExito = vi.fn();
    const alError = vi.fn();

    service.loginReal('mfa@test.com', 'clave').subscribe({ next: alExito, error: alError });

    expect(alExito).not.toHaveBeenCalled();
    expect(alError).toHaveBeenCalledTimes(1);
    expect(alError.mock.calls[0][0]).toBeInstanceOf(RetoMfaRequerido);
  });

  it('no guarda sesion ni token cuando el back pide el codigo', () => {
    post.mockReturnValue(of({ mfaRequerido: true }));

    service.loginReal('mfa@test.com', 'clave').subscribe({ error: () => undefined });

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('casitago_token')).toBeNull();
    expect(localStorage.getItem('casitago_usuario')).toBeNull();
  });

  it('un login normal sin mfaRequerido sigue guardando la sesion', () => {
    post.mockReturnValue(of({
      token: 'token-de-prueba',
      expiraEnSegundos: 3600,
      usuarioId: 'uuid-usuario-1',
      nombre: 'Usuario de prueba',
      rol: 'HUESPED'
    }));

    service.loginReal('normal@test.com', 'clave').subscribe();

    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('casitago_token')).toBe('token-de-prueba');
  });
});
