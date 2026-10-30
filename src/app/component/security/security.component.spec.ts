
// @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SecurityComponent } from './security.component';
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

describe('SecurityComponent', () => {
  let component: SecurityComponent;
  let obtenerPerfil: ReturnType<typeof vi.fn>;
  let cambiarMfa: ReturnType<typeof vi.fn>;

  const crearError = (status: number, error: unknown = null) =>
    new HttpErrorResponse({ status, error });

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SessionService,
          useValue: { obtenerPerfil, cambiarMfa }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new SecurityComponent()
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    obtenerPerfil = vi.fn().mockReturnValue(
      of({ mfaHabilitado: false })
    );

    cambiarMfa = vi.fn().mockReturnValue(of(null));
  });

  describe('Inicialización y consulta del perfil', () => {
    it('debe crear el componente', () => {
      crearComponente();
      expect(component).toBeTruthy();
    });

    it('debe consultar el perfil al iniciar', () => {
      crearComponente();
      expect(obtenerPerfil).toHaveBeenCalledTimes(1);
    });

    it('debe iniciar con MFA desactivado si el perfil lo indica', () => {
      crearComponente();
      expect(component.activo()).toBe(false);
    });

    it('debe reconocer MFA activado en el perfil', () => {
      obtenerPerfil.mockReturnValue(
        of({ mfaHabilitado: true })
      );

      crearComponente();
      expect(component.activo()).toBe(true);
    });

    it('debe interpretar un valor MFA ausente como desactivado', () => {
      obtenerPerfil.mockReturnValue(of({}));

      crearComponente();
      expect(component.activo()).toBe(false);
    });

    it('debe finalizar la carga al obtener el perfil', () => {
      crearComponente();
      expect(component.cargando()).toBe(false);
    });

    it('debe permanecer cargando mientras espera el perfil', () => {
      const pendiente = new Subject<any>();
      obtenerPerfil.mockReturnValue(pendiente.asObservable());

      crearComponente();

      expect(component.cargando()).toBe(true);

      pendiente.next({ mfaHabilitado: true });
      pendiente.complete();

      expect(component.cargando()).toBe(false);
      expect(component.activo()).toBe(true);
    });

    it('debe iniciar sin ninguna acción seleccionada', () => {
      crearComponente();
      expect(component.accion()).toBeNull();
    });

    it('debe iniciar sin enviar cambios', () => {
      crearComponente();
      expect(component.enviando()).toBe(false);
    });

    it('debe iniciar sin errores', () => {
      crearComponente();
      expect(component.error()).toBe('');
    });

    it('debe iniciar sin avisos', () => {
      crearComponente();
      expect(component.notice()).toBe('');
    });

    it('debe iniciar con contraseña vacía', () => {
      crearComponente();
      expect(component.contrasena).toBe('');
    });
  });

  describe('Abrir acciones de seguridad', () => {
    it('debe seleccionar la acción activar', () => {
      crearComponente();

      component.abrir('activar');

      expect(component.accion()).toBe('activar');
    });

    it('debe seleccionar la acción desactivar', () => {
      crearComponente();

      component.abrir('desactivar');

      expect(component.accion()).toBe('desactivar');
    });

    it('debe limpiar la contraseña al abrir una acción', () => {
      crearComponente();
      component.contrasena = 'ClaveAnterior';

      component.abrir('activar');

      expect(component.contrasena).toBe('');
    });

    it('debe limpiar errores anteriores al abrir una acción', () => {
      crearComponente();
      component.error.set('Error anterior');

      component.abrir('activar');

      expect(component.error()).toBe('');
    });

    it('debe limpiar avisos anteriores al abrir una acción', () => {
      crearComponente();
      component.notice.set('Aviso anterior');

      component.abrir('desactivar');

      expect(component.notice()).toBe('');
    });

    it('debe permitir cambiar la acción seleccionada', () => {
      crearComponente();

      component.abrir('activar');
      component.abrir('desactivar');

      expect(component.accion()).toBe('desactivar');
    });
  });

  describe('Cancelación', () => {
    it('debe eliminar la acción al cancelar', () => {
      crearComponente();
      component.abrir('activar');

      component.cancelar();

      expect(component.accion()).toBeNull();
    });

    it('debe limpiar la contraseña al cancelar', () => {
      crearComponente();
      component.abrir('activar');
      component.contrasena = 'Clave12345';

      component.cancelar();

      expect(component.contrasena).toBe('');
    });

    it('debe limpiar el error al cancelar', () => {
      crearComponente();
      component.error.set('Error anterior');

      component.cancelar();

      expect(component.error()).toBe('');
    });

    it('no debe llamar al backend al cancelar', () => {
      crearComponente();
      component.abrir('activar');

      component.cancelar();

      expect(cambiarMfa).not.toHaveBeenCalled();
    });

    it('no debe cambiar el estado MFA al cancelar', () => {
      crearComponente();
      component.abrir('activar');

      component.cancelar();

      expect(component.activo()).toBe(false);
    });
  });

  describe('Validación de confirmación', () => {
    it('no debe confirmar si no hay acción seleccionada', () => {
      crearComponente();
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(cambiarMfa).not.toHaveBeenCalled();
    });

    it('no debe confirmar si la contraseña está vacía', () => {
      crearComponente();
      component.abrir('activar');

      component.confirmar();

      expect(cambiarMfa).not.toHaveBeenCalled();
    });

    it('no debe activar el envío cuando falta la contraseña', () => {
      crearComponente();
      component.abrir('activar');

      component.confirmar();

      expect(component.enviando()).toBe(false);
    });

    it('no debe modificar MFA cuando faltan datos', () => {
      crearComponente();
      component.abrir('activar');

      component.confirmar();

      expect(component.activo()).toBe(false);
    });
  });

  describe('Activación de MFA', () => {
    it('debe enviar true al activar MFA', () => {
      crearComponente();
      component.abrir('activar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(cambiarMfa).toHaveBeenCalledWith(
        true,
        'Clave12345'
      );
    });

    it('debe activar MFA después de una respuesta correcta', () => {
      crearComponente();
      component.abrir('activar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(component.activo()).toBe(true);
    });

    it('debe mostrar aviso de activación correcta', () => {
      crearComponente();
      component.abrir('activar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(component.notice()).toContain(
        'Verificación activada'
      );
    });

    it('debe limpiar la contraseña después de activar', () => {
      crearComponente();
      component.abrir('activar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(component.contrasena).toBe('');
    });

    it('debe cerrar la acción después de activar', () => {
      crearComponente();
      component.abrir('activar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(component.accion()).toBeNull();
    });

    it('debe finalizar el envío después de activar', () => {
      crearComponente();
      component.abrir('activar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(component.enviando()).toBe(false);
    });

    it('debe mantener MFA sin activar mientras espera al servidor', () => {
      const pendiente = new Subject<null>();
      cambiarMfa.mockReturnValue(pendiente.asObservable());

      crearComponente();
      component.abrir('activar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(component.enviando()).toBe(true);
      expect(component.activo()).toBe(false);

      pendiente.next(null);
      pendiente.complete();

      expect(component.enviando()).toBe(false);
      expect(component.activo()).toBe(true);
    });
  });

  describe('Desactivación de MFA', () => {
    beforeEach(() => {
      obtenerPerfil.mockReturnValue(
        of({ mfaHabilitado: true })
      );
    });

    it('debe enviar false al desactivar MFA', () => {
      crearComponente();
      component.abrir('desactivar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(cambiarMfa).toHaveBeenCalledWith(
        false,
        'Clave12345'
      );
    });

    it('debe desactivar MFA después de una respuesta correcta', () => {
      crearComponente();
      component.abrir('desactivar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(component.activo()).toBe(false);
    });

    it('debe mostrar aviso de desactivación', () => {
      crearComponente();
      component.abrir('desactivar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(component.notice()).toBe(
        'Verificación desactivada.'
      );
    });

    it('debe limpiar la contraseña después de desactivar', () => {
      crearComponente();
      component.abrir('desactivar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(component.contrasena).toBe('');
    });

    it('debe cerrar la acción después de desactivar', () => {
      crearComponente();
      component.abrir('desactivar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(component.accion()).toBeNull();
    });
  });

  describe('Errores del servidor', () => {
    it('debe mostrar error de conexión al consultar el perfil', () => {
      obtenerPerfil.mockReturnValue(
        throwError(() => crearError(0))
      );

      crearComponente();

      expect(component.error()).toContain(
        'No se pudo conectar con el servidor'
      );
    });

    it('debe finalizar la carga cuando falla el perfil', () => {
      obtenerPerfil.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();

      expect(component.cargando()).toBe(false);
    });

    it('debe mostrar el mensaje del backend para error 400', () => {
      cambiarMfa.mockReturnValue(
        throwError(() => crearError(400, 'Contraseña incorrecta'))
      );

      crearComponente();
      component.abrir('activar');
      component.contrasena = 'ClaveIncorrecta';

      component.confirmar();

      expect(component.error()).toBe('Contraseña incorrecta');
    });

    it('debe mostrar error general para estado 403', () => {
      cambiarMfa.mockReturnValue(
        throwError(() => crearError(403))
      );

      crearComponente();
      component.abrir('activar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(component.error()).toBe(
        'No se pudo completar la operación. Intenta de nuevo.'
      );
    });

    it('debe mostrar error general para estado 500', () => {
      cambiarMfa.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      component.abrir('activar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(component.error()).toContain(
        'No se pudo completar la operación'
      );
    });

    it('no debe activar MFA cuando el servidor devuelve error', () => {
      cambiarMfa.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      component.abrir('activar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(component.activo()).toBe(false);
    });

    it('debe conservar la acción cuando falla la operación', () => {
      cambiarMfa.mockReturnValue(
        throwError(() => crearError(400, 'Contraseña incorrecta'))
      );

      crearComponente();
      component.abrir('activar');
      component.contrasena = 'ClaveIncorrecta';

      component.confirmar();

      expect(component.accion()).toBe('activar');
    });

    it('debe finalizar el envío cuando ocurre un error', () => {
      cambiarMfa.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      component.abrir('activar');
      component.contrasena = 'Clave12345';

      component.confirmar();

      expect(component.enviando()).toBe(false);
    });

    it('debe permitir reintentar después de un error', () => {
      cambiarMfa
        .mockReturnValueOnce(
          throwError(() => crearError(400, 'Contraseña incorrecta'))
        )
        .mockReturnValueOnce(of(null));

      crearComponente();
      component.abrir('activar');
      component.contrasena = 'ClaveIncorrecta';

      component.confirmar();

      expect(component.error()).toBe('Contraseña incorrecta');

      component.contrasena = 'ClaveCorrecta123';
      component.confirmar();

      expect(cambiarMfa).toHaveBeenCalledTimes(2);
      expect(component.activo()).toBe(true);
      expect(component.error()).toBe('');
    });
  });
});
