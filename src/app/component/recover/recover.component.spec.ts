
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

import { RecoverComponent } from './recover.component';
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

describe('RecoverComponent', () => {
  let component: RecoverComponent;

  let solicitarRecuperacion: ReturnType<typeof vi.fn>;
  let confirmarRecuperacion: ReturnType<typeof vi.fn>;

  const crearError = (
    status: number,
    error: unknown = null
  ) => new HttpErrorResponse({ status, error });

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SessionService,
          useValue: {
            solicitarRecuperacion,
            confirmarRecuperacion
          }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new RecoverComponent()
    );
  };

  const llenarCorreo = (email = 'usuario@correo.com') => {
    component.formCorreo.patchValue({ email });
  };

  const llenarCodigo = () => {
    component.formCodigo.patchValue({
      codigo: '123456',
      password: 'NuevaClave123',
      confirmPassword: 'NuevaClave123'
    });
  };

  const avanzarACodigo = () => {
    llenarCorreo();
    component.solicitar();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    solicitarRecuperacion = vi.fn().mockReturnValue(of(null));
    confirmarRecuperacion = vi.fn().mockReturnValue(of(null));
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe iniciar en el paso de correo', () => {
      crearComponente();

      expect(component.paso()).toBe('correo');
    });

    it('debe iniciar sin enviar solicitudes', () => {
      crearComponente();

      expect(component.enviando()).toBe(false);
    });

    it('debe iniciar sin errores', () => {
      crearComponente();

      expect(component.authError()).toBe('');
    });

    it('debe iniciar sin intentar enviar el correo', () => {
      crearComponente();

      expect(component.intentoCorreo()).toBe(false);
    });

    it('debe iniciar sin intentar confirmar el código', () => {
      crearComponente();

      expect(component.intentoCodigo()).toBe(false);
    });

    it('debe iniciar con el correo vacío', () => {
      crearComponente();

      expect(component.correo).toBe('');
    });

    it('debe iniciar con el formulario de correo inválido', () => {
      crearComponente();

      expect(component.formCorreo.invalid).toBe(true);
    });

    it('debe iniciar con el formulario de código inválido', () => {
      crearComponente();

      expect(component.formCodigo.invalid).toBe(true);
    });
  });

  describe('Validación del correo', () => {
    it('debe aceptar un correo válido', () => {
      crearComponente();
      llenarCorreo();

      expect(component.formCorreo.valid).toBe(true);
    });

    it('debe rechazar un correo vacío', () => {
      crearComponente();
      llenarCorreo('');

      expect(component.formCorreo.invalid).toBe(true);
    });

    it('debe rechazar un correo sin arroba', () => {
      crearComponente();
      llenarCorreo('usuariocorreo.com');

      expect(component.formCorreo.invalid).toBe(true);
    });

    it('debe rechazar un correo sin dominio', () => {
      crearComponente();
      llenarCorreo('usuario@');

      expect(component.formCorreo.invalid).toBe(true);
    });

    it('no debe llamar al backend con correo inválido', () => {
      crearComponente();

      component.solicitar();

      expect(solicitarRecuperacion).not.toHaveBeenCalled();
    });

    it('debe marcar el intento de envío de correo', () => {
      crearComponente();

      component.solicitar();

      expect(component.intentoCorreo()).toBe(true);
    });

    it('debe marcar el correo como tocado si es inválido', () => {
      crearComponente();

      component.solicitar();

      expect(component.formCorreo.get('email')?.touched).toBe(true);
    });
  });

  describe('Solicitud de recuperación', () => {
    it('debe enviar el correo al servicio', () => {
      crearComponente();
      llenarCorreo();

      component.solicitar();

      expect(solicitarRecuperacion).toHaveBeenCalledWith(
        'usuario@correo.com'
      );
    });

    it('debe eliminar espacios al inicio y final del correo', () => {
      crearComponente();
      llenarCorreo(' usuario@correo.com ');

      component.solicitar();

      expect(solicitarRecuperacion).toHaveBeenCalledWith(
        'usuario@correo.com'
      );
    });

    it('debe conservar el correo para la confirmación', () => {
      crearComponente();
      avanzarACodigo();

      expect(component.correo).toBe('usuario@correo.com');
    });

    it('debe pasar al formulario de código después de solicitar', () => {
      crearComponente();
      avanzarACodigo();

      expect(component.paso()).toBe('codigo');
    });

    it('debe finalizar el envío después de solicitar correctamente', () => {
      crearComponente();
      avanzarACodigo();

      expect(component.enviando()).toBe(false);
    });

    it('debe mostrar el estado de carga mientras espera el servidor', () => {
      const pendiente = new Subject<null>();
      solicitarRecuperacion.mockReturnValue(pendiente.asObservable());

      crearComponente();
      llenarCorreo();

      component.solicitar();

      expect(component.enviando()).toBe(true);
      expect(component.paso()).toBe('correo');

      pendiente.next(null);
      pendiente.complete();

      expect(component.enviando()).toBe(false);
      expect(component.paso()).toBe('codigo');
    });

    it('debe limpiar errores anteriores antes de solicitar', () => {
      crearComponente();
      llenarCorreo();
      component.authError.set('Error anterior');

      component.solicitar();

      expect(component.authError()).toBe('');
    });

    it('debe permitir solicitar recuperación nuevamente', () => {
      crearComponente();
      llenarCorreo();

      component.solicitar();
      component.cambiarCorreo();
      component.solicitar();

      expect(solicitarRecuperacion).toHaveBeenCalledTimes(2);
    });
  });

  describe('Validación del código y contraseña', () => {
    it('debe aceptar el formulario de código completo', () => {
      crearComponente();
      llenarCodigo();

      expect(component.formCodigo.valid).toBe(true);
    });

    it('debe rechazar un código vacío', () => {
      crearComponente();
      llenarCodigo();
      component.formCodigo.patchValue({ codigo: '' });

      expect(component.formCodigo.invalid).toBe(true);
    });

    it('debe rechazar una contraseña vacía', () => {
      crearComponente();
      llenarCodigo();
      component.formCodigo.patchValue({ password: '' });

      expect(component.formCodigo.invalid).toBe(true);
    });

    it('debe rechazar una contraseña menor de ocho caracteres', () => {
      crearComponente();
      llenarCodigo();
      component.formCodigo.patchValue({
        password: '1234567',
        confirmPassword: '1234567'
      });

      expect(component.formCodigo.invalid).toBe(true);
    });

    it('debe aceptar una contraseña de ocho caracteres', () => {
      crearComponente();
      llenarCodigo();
      component.formCodigo.patchValue({
        password: '12345678',
        confirmPassword: '12345678'
      });

      expect(component.formCodigo.valid).toBe(true);
    });

    it('debe aceptar una contraseña de 72 caracteres', () => {
      crearComponente();
      llenarCodigo();
      component.formCodigo.patchValue({
        password: 'A'.repeat(72),
        confirmPassword: 'A'.repeat(72)
      });

      expect(component.formCodigo.valid).toBe(true);
    });

    it('debe rechazar una contraseña mayor de 72 caracteres', () => {
      crearComponente();
      llenarCodigo();
      component.formCodigo.patchValue({
        password: 'A'.repeat(73),
        confirmPassword: 'A'.repeat(73)
      });

      expect(component.formCodigo.invalid).toBe(true);
    });

    it('debe rechazar una confirmación vacía', () => {
      crearComponente();
      llenarCodigo();
      component.formCodigo.patchValue({ confirmPassword: '' });

      expect(component.formCodigo.invalid).toBe(true);
    });

    it('no debe confirmar si las contraseñas son diferentes', () => {
      crearComponente();
      llenarCodigo();
      component.formCodigo.patchValue({
        confirmPassword: 'OtraClave123'
      });

      component.confirmar();

      expect(confirmarRecuperacion).not.toHaveBeenCalled();
    });

    it('debe marcar el intento de confirmación', () => {
      crearComponente();

      component.confirmar();

      expect(component.intentoCodigo()).toBe(true);
    });

    it('debe marcar los campos como tocados al confirmar', () => {
      crearComponente();

      component.confirmar();

      expect(component.formCodigo.get('codigo')?.touched).toBe(true);
      expect(component.formCodigo.get('password')?.touched).toBe(true);
      expect(component.formCodigo.get('confirmPassword')?.touched).toBe(true);
    });
  });

  describe('Confirmación de recuperación', () => {
    it('debe enviar correo, código y contraseña al backend', () => {
      crearComponente();
      avanzarACodigo();
      llenarCodigo();

      component.confirmar();

      expect(confirmarRecuperacion).toHaveBeenCalledWith(
        'usuario@correo.com',
        '123456',
        'NuevaClave123'
      );
    });

    it('debe eliminar espacios del código de recuperación', () => {
      crearComponente();
      avanzarACodigo();
      llenarCodigo();
      component.formCodigo.patchValue({ codigo: ' 123456 ' });

      component.confirmar();

      expect(confirmarRecuperacion).toHaveBeenCalledWith(
        'usuario@correo.com',
        '123456',
        'NuevaClave123'
      );
    });

    it('debe finalizar el proceso al confirmar correctamente', () => {
      crearComponente();
      avanzarACodigo();
      llenarCodigo();

      component.confirmar();

      expect(component.paso()).toBe('listo');
    });

    it('debe finalizar el estado de carga después de confirmar', () => {
      crearComponente();
      avanzarACodigo();
      llenarCodigo();

      component.confirmar();

      expect(component.enviando()).toBe(false);
    });

    it('debe permanecer en código mientras espera confirmación', () => {
      const pendiente = new Subject<null>();
      confirmarRecuperacion.mockReturnValue(pendiente.asObservable());

      crearComponente();
      avanzarACodigo();
      llenarCodigo();

      component.confirmar();

      expect(component.enviando()).toBe(true);
      expect(component.paso()).toBe('codigo');

      pendiente.next(null);
      pendiente.complete();

      expect(component.paso()).toBe('listo');
      expect(component.enviando()).toBe(false);
    });

    it('debe limpiar errores anteriores antes de confirmar', () => {
      crearComponente();
      avanzarACodigo();
      llenarCodigo();
      component.authError.set('Error anterior');

      component.confirmar();

      expect(component.authError()).toBe('');
    });
  });

  describe('Cambio de correo', () => {
    it('debe regresar al paso de correo', () => {
      crearComponente();
      avanzarACodigo();

      component.cambiarCorreo();

      expect(component.paso()).toBe('correo');
    });

    it('debe limpiar el error al cambiar el correo', () => {
      crearComponente();
      component.authError.set('Error anterior');

      component.cambiarCorreo();

      expect(component.authError()).toBe('');
    });

    it('debe reiniciar el intento de código', () => {
      crearComponente();
      component.intentoCodigo.set(true);

      component.cambiarCorreo();

      expect(component.intentoCodigo()).toBe(false);
    });

    it('debe limpiar el formulario de código', () => {
      crearComponente();
      llenarCodigo();

      component.cambiarCorreo();

      expect(component.formCodigo.get('codigo')?.value).toBeNull();
      expect(component.formCodigo.get('password')?.value).toBeNull();
      expect(component.formCodigo.get('confirmPassword')?.value).toBeNull();
    });
  });

  describe('Errores del servidor', () => {
    it('debe mostrar error de conexión al solicitar', () => {
      solicitarRecuperacion.mockReturnValue(
        throwError(() => crearError(0))
      );

      crearComponente();
      llenarCorreo();
      component.solicitar();

      expect(component.authError()).toContain(
        'No se pudo conectar con el servidor'
      );
    });

    it('debe mostrar el mensaje del backend para error 400', () => {
      solicitarRecuperacion.mockReturnValue(
        throwError(() => crearError(400, 'Correo no encontrado'))
      );

      crearComponente();
      llenarCorreo();
      component.solicitar();

      expect(component.authError()).toBe('Correo no encontrado');
    });

    it('debe mostrar error de validación para estado 403', () => {
      solicitarRecuperacion.mockReturnValue(
        throwError(() => crearError(403))
      );

      crearComponente();
      llenarCorreo();
      component.solicitar();

      expect(component.authError()).toContain(
        'Los datos no son válidos'
      );
    });

    it('debe mostrar error general para estado 500', () => {
      solicitarRecuperacion.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      llenarCorreo();
      component.solicitar();

      expect(component.authError()).toBe(
        'No se pudo completar la operación. Intenta de nuevo en un momento.'
      );
    });

    it('debe permanecer en correo cuando falla la solicitud', () => {
      solicitarRecuperacion.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      llenarCorreo();
      component.solicitar();

      expect(component.paso()).toBe('correo');
      expect(component.enviando()).toBe(false);
    });

    it('debe mostrar error al fallar la confirmación', () => {
      confirmarRecuperacion.mockReturnValue(
        throwError(() => crearError(400, 'Código incorrecto'))
      );

      crearComponente();
      avanzarACodigo();
      llenarCodigo();
      component.confirmar();

      expect(component.authError()).toBe('Código incorrecto');
      expect(component.paso()).toBe('codigo');
      expect(component.enviando()).toBe(false);
    });
  });
});
