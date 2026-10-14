// @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditComponent } from './audit.component';
import {
  AdminBackService,
  EventoAuditoriaBack,
  UsuarioAdminBack
} from '../../core/services/admin-back.service';
import { ToastService } from '../../core/services/toast.service';

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

describe('AuditComponent - nombre del actor', () => {
  let component: AuditComponent;
  let auditoria: ReturnType<typeof vi.fn>;
  let usuarios: ReturnType<typeof vi.fn>;

  const crearEvento = (
    cambios: Partial<EventoAuditoriaBack> = {}
  ): EventoAuditoriaBack => ({
    id: 'evento-1',
    creadoEn: '2026-10-10T10:30:00',
    usuarioId: 'usuario-123456789',
    entidad: 'PUBLICACION',
    accion: 'CREAR',
    resultado: 'EXITOSO',
    detalle: null,
    ...cambios
  });

  const crearUsuario = (
    cambios: Partial<UsuarioAdminBack> = {}
  ): UsuarioAdminBack => ({
    id: 'usuario-123456789',
    creadoEn: '2026-10-03T01:51:29.851921Z',
    nombre: 'Ana Anfitriona',
    correo: 'ana@correo.com',
    rol: 'ANFITRION',
    activo: true,
    mfaHabilitado: false,
    restringido: false,
    ...cambios
  });

  const crearComponente = (): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminBackService, useValue: { auditoria, usuarios } },
        { provide: ToastService, useValue: { show: vi.fn() } }
      ]
    });

    component = TestBed.runInInjectionContext(() => new AuditComponent());
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    auditoria = vi.fn().mockReturnValue(of([]));
    usuarios = vi.fn().mockReturnValue(of([]));
  });

  it('debe mostrar el nombre del usuario cuando esta en la lista', () => {
    usuarios.mockReturnValue(of([crearUsuario()]));

    crearComponente();

    expect(component.actor(crearEvento())).toBe('Ana Anfitriona');
  });

  it('debe mostrar los primeros 8 caracteres del id si el usuario no aparece', () => {
    usuarios.mockReturnValue(of([crearUsuario({ id: 'otro-usuario' })]));

    crearComponente();

    expect(component.actor(crearEvento())).toBe('usuario-');
  });

  it('debe mostrar Sistema cuando el evento no tiene usuario', () => {
    usuarios.mockReturnValue(of([crearUsuario()]));

    crearComponente();

    expect(component.actor(crearEvento({ usuarioId: null }))).toBe('Sistema');
  });

  it('debe usar los ids y no mostrar error si falla la lista de usuarios', () => {
    auditoria.mockReturnValue(of([crearEvento()]));
    usuarios.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );

    crearComponente();

    expect(component.nombres()).toEqual({});
    expect(component.errorCarga()).toBe('');
    expect(component.cargando()).toBe(false);
    expect(component.actor(crearEvento())).toBe('usuario-');
  });

  it('debe encontrar un evento buscando por el nombre del actor', () => {
    auditoria.mockReturnValue(
      of([
        crearEvento({ id: 'e1', usuarioId: 'usuario-123456789' }),
        crearEvento({ id: 'e2', usuarioId: 'usuario-999999999' })
      ])
    );
    usuarios.mockReturnValue(
      of([
        crearUsuario(),
        crearUsuario({ id: 'usuario-999999999', nombre: 'Hugo Huesped' })
      ])
    );

    crearComponente();
    component.search.set('hugo');

    expect(component.visible().map((evento) => evento.id)).toEqual(['e2']);
  });
});
