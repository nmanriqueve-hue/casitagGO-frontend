
 // @vitest-environment jsdom

import '@angular/compiler';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { Router } from '@angular/router';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { FavoriteButtonComponent } from './favorite-button.component';
import { FavoritesService } from '../../core/services/favorites.service';
import { SessionService } from '../../core/services/session.service';

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

describe('FavoriteButtonComponent', () => {
  let component: FavoriteButtonComponent;

  let rol: ReturnType<typeof signal<string>>;
  let autenticado: ReturnType<typeof signal<boolean>>;
  let favoritoPorId: ReturnType<typeof signal<boolean>>;
  let favoritoPorUuid: ReturnType<typeof signal<boolean>>;

  const has = vi.fn();
  const hasUuid = vi.fn();
  const toggleFavorito = vi.fn();
  const alternarUuid = vi.fn();
  const navigate = vi.fn();

  // Crea el componente sin cargar archivos HTML o CSS.
  // Los inputs se sustituyen por señales de lectura controladas.
  const crearComponente = (
    id = 1,
    uuid: string | null = null
  ): FavoriteButtonComponent => {
    const instancia = TestBed.runInInjectionContext(
      () => new FavoriteButtonComponent()
    );

    const idSignal = signal(id);
    const uuidSignal = signal<string | null>(uuid);

    Object.defineProperty(instancia, 'listingId', {
      value: idSignal.asReadonly(),
      configurable: true
    });

    Object.defineProperty(instancia, 'listingUuid', {
      value: uuidSignal.asReadonly(),
      configurable: true
    });

    return instancia;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();

    rol = signal('guest');
    autenticado = signal(true);
    favoritoPorId = signal(false);
    favoritoPorUuid = signal(false);

    has.mockImplementation(() => favoritoPorId());
    hasUuid.mockImplementation(() => favoritoPorUuid());

    TestBed.configureTestingModule({
      providers: [
        {
          provide: FavoritesService,
          useValue: {
            has,
            hasUuid,
            toggle: toggleFavorito,
            alternarUuid
          }
        },
        {
          provide: SessionService,
          useValue: {
            role: rol,
            isAuthenticated: () => autenticado()
          }
        },
        {
          provide: Router,
          useValue: {
            navigate
          }
        }
      ]
    });

    component = crearComponente();
  });

  // CREACIÓN E INICIALIZACIÓN

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe recibir el ID de la publicación', () => {
    expect(component.listingId()).toBe(1);
  });

  it('debe iniciar con UUID nulo', () => {
    expect(component.listingUuid()).toBeNull();
  });

  it('debe tener el método toggle', () => {
    expect(typeof component.toggle).toBe('function');
  });

  it('debe disponer del servicio de favoritos', () => {
    expect(component.favorites).toBeTruthy();
  });

  it('debe disponer del servicio de sesión', () => {
    expect(component.session).toBeTruthy();
  });

  // RESTRICCIONES PARA ADMINISTRADORES

  it('no debe modificar favoritos si es administrador', () => {
    rol.set('admin');

    component.toggle();

    expect(toggleFavorito).not.toHaveBeenCalled();
    expect(alternarUuid).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('no debe redirigir al administrador al login', () => {
    rol.set('admin');
    autenticado.set(false);

    component.toggle();

    expect(navigate).not.toHaveBeenCalled();
    expect(toggleFavorito).not.toHaveBeenCalled();
  });

  // USUARIOS NO AUTENTICADOS

  it('debe redirigir al login si no está autenticado', () => {
    autenticado.set(false);

    component.toggle();

    expect(navigate).toHaveBeenCalledWith(
      ['/iniciar-sesion'],
      {
        queryParams: {
          returnUrl: '/favoritos'
        }
      }
    );
  });

  it('no debe modificar favoritos sin autenticación', () => {
    autenticado.set(false);

    component.toggle();

    expect(toggleFavorito).not.toHaveBeenCalled();
    expect(alternarUuid).not.toHaveBeenCalled();
  });

  // FAVORITOS POR ID

  it('no debe redirigir si está autenticado', () => {
    component.toggle();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('debe alternar favoritos por ID', () => {
    component.toggle();

    expect(toggleFavorito).toHaveBeenCalledWith(1);
    expect(alternarUuid).not.toHaveBeenCalled();
  });

  it('debe alternar favoritos una sola vez', () => {
    component.toggle();

    expect(toggleFavorito).toHaveBeenCalledTimes(1);
  });

  it('no debe utilizar UUID cuando es nulo', () => {
    component.toggle();

    expect(alternarUuid).not.toHaveBeenCalled();
    expect(toggleFavorito).toHaveBeenCalledWith(1);
  });

  it('debe permitir alternar favoritos varias veces', () => {
    component.toggle();
    component.toggle();

    expect(toggleFavorito).toHaveBeenCalledTimes(2);
  });

  // ESTADO GUARDADO

  it('debe consultar si el favorito está guardado por ID', () => {
    expect(component.guardado()).toBe(false);
    expect(has).toHaveBeenCalledWith(1);
  });

  it('debe devolver verdadero cuando el ID está guardado', () => {
    favoritoPorId.set(true);

    expect(component.guardado()).toBe(true);
  });

  it('debe actualizar guardado cuando cambia el estado del favorito', () => {
    expect(component.guardado()).toBe(false);

    favoritoPorId.set(true);
    expect(component.guardado()).toBe(true);

    favoritoPorId.set(false);
    expect(component.guardado()).toBe(false);
  });

  it('debe tener disponible la señal guardado', () => {
    expect(typeof component.guardado).toBe('function');
  });

  // FAVORITOS POR UUID

  it('debe permitir establecer un UUID', () => {
    component = crearComponente(2, 'uuid-123');

    expect(component.listingId()).toBe(2);
    expect(component.listingUuid()).toBe('uuid-123');
  });

  it('debe consultar favoritos por UUID', () => {
    component = crearComponente(2, 'uuid-123');

    expect(component.guardado()).toBe(false);

    expect(hasUuid).toHaveBeenCalledWith('uuid-123');
    expect(has).not.toHaveBeenCalled();
  });

  it('debe alternar favoritos por UUID', () => {
    component = crearComponente(2, 'uuid-123');

    component.toggle();

    expect(alternarUuid).toHaveBeenCalledWith(
      'uuid-123',
      expect.any(Function)
    );

    expect(alternarUuid).toHaveBeenCalledTimes(1);
    expect(toggleFavorito).not.toHaveBeenCalled();
  });

  it('debe mostrar una alerta cuando el servicio informa un mensaje', () => {
    const alerta = vi
      .spyOn(window, 'alert')
      .mockImplementation(() => {});

    alternarUuid.mockImplementation(
      (_uuid: string, avisar: (mensaje: string) => void) => {
        avisar('Favorito actualizado');
      }
    );

    component = crearComponente(2, 'uuid-123');

    component.toggle();

    expect(alerta).toHaveBeenCalledWith(
      'Favorito actualizado'
    );

    alerta.mockRestore();
  });

  it('debe devolver verdadero cuando el UUID está guardado', () => {
    favoritoPorUuid.set(true);
    component = crearComponente(2, 'uuid-123');

    expect(component.guardado()).toBe(true);
  });

  it('debe actualizar guardado cuando cambia el estado del UUID', () => {
    component = crearComponente(2, 'uuid-123');

    expect(component.guardado()).toBe(false);

    favoritoPorUuid.set(true);
    expect(component.guardado()).toBe(true);

    favoritoPorUuid.set(false);
    expect(component.guardado()).toBe(false);
  });

  it('no debe alternar favoritos por UUID si es administrador', () => {
    rol.set('admin');
    component = crearComponente(2, 'uuid-123');

    component.toggle();

    expect(alternarUuid).not.toHaveBeenCalled();
    expect(toggleFavorito).not.toHaveBeenCalled();
  });

  it('no debe alternar favoritos por UUID si no está autenticado', () => {
    autenticado.set(false);
    component = crearComponente(2, 'uuid-123');

    component.toggle();

    expect(alternarUuid).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(
      ['/iniciar-sesion'],
      {
        queryParams: {
          returnUrl: '/favoritos'
        }
      }
    );
  });
});
