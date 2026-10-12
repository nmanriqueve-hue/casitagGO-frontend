
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

import { VerifyComponent } from './verify.component';
import { SessionService } from '../../core/services/session.service';
import { MfaService } from '../../core/services/mfa.service';
import { Router } from '@angular/router';

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

describe('VerifyComponent', () => {
  let component: VerifyComponent;

  let challenge: ReturnType<typeof vi.fn>;
  let clear: ReturnType<typeof vi.fn>;
  let esPeticionDeCodigo: ReturnType<typeof vi.fn>;
  let loginReal: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  let reto: {
    email: string;
    password: string;
    returnUrl: string | null;
  } | null;

  let usuario: { role: 'guest' | 'host' | 'admin' };

  const crearError = (status: number, error: unknown = null) =>
    new HttpErrorResponse({ status, error });

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MfaService,
          useValue: { challenge, clear, esPeticionDeCodigo }
        },
        {
          provide: SessionService,
          useValue: { loginReal }
        },
        {
          provide: Router,
          useValue: { navigate, navigateByUrl }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new VerifyComponent()
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    reto = {
      email: 'usuario@correo.com',
      password: 'Clave12345',
      returnUrl: null
    };

    usuario = { role: 'guest' };

    challenge = vi.fn().mockImplementation(() => reto);
    clear = vi.fn();
    esPeticionDeCodigo = vi.fn().mockReturnValue(false);
    loginReal = vi.fn().mockReturnValue(of(usuario));
    navigate = vi.fn().mockResolvedValue(true);
    navigateByUrl = vi.fn().mockResolvedValue(true);
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe iniciar con el código vacío', () => {
      crearComponente();

      expect(component.code).toBe('');
    });

    it('debe iniciar sin errores', () => {
      crearComponente();

      expect(component.error()).toBe('');
    });

    it('debe iniciar sin avisos', () => {
      crearComponente();

      expect(component.aviso()).toBe('');
    });

    it('debe iniciar sin estar enviando', () => {
      crearComponente();

      expect(component.enviando()).toBe(false);
    });

    it('debe tener acceso al servicio MFA', () => {
      crearComponente();

      expect(component.mfa).toBeTruthy();
    });
  });

  describe('Verificación del código', () => {
    it('no debe verificar si no existe un reto MFA', () => {
      reto = null;
      crearComponente();

      component.code = '123456';
      component.verify();

      expect(loginReal).not.toHaveBeenCalled();
    });

    it('no debe activar el envío sin reto MFA', () => {
      reto = null;
      crearComponente();

      component.verify();

      expect(component.enviando()).toBe(false);
    });

    it('debe enviar las credenciales y el código', () => {
      crearComponente();
      component.code = '123456';

      component.verify();

      expect(loginReal).toHaveBeenCalledWith(
        'usuario@correo.com',
        'Clave12345',
        '123456'
      );
    });

    it('debe eliminar espacios del código', () => {
      crearComponente();
      component.code = ' 123456 ';

      component.verify();

      expect(loginReal).toHaveBeenCalledWith(
        'usuario@correo.com',
        'Clave12345',
        '123456'
      );
    });

    it('debe conservar el correo del reto', () => {
      reto = {
        email: 'otro@correo.com',
        password: 'Clave12345',
        returnUrl: null
      };
      crearComponente();

      component.code = '123456';
      component.verify();

      expect(loginReal).toHaveBeenCalledWith(
        'otro@correo.com',
        'Clave12345',
        '123456'
      );
    });

    it('debe activar el envío mientras espera respuesta', () => {
      const pendiente = new Subject<any>();
      loginReal.mockReturnValue(pendiente.asObservable());

      crearComponente();
      component.code = '123456';
      component.verify();

      expect(component.enviando()).toBe(true);

      pendiente.next(usuario);
      pendiente.complete();
    });

    it('debe finalizar el envío después de verificar', () => {
      crearComponente();
      component.code = '123456';

      component.verify();

      expect(component.enviando()).toBe(false);
    });

    it('debe limpiar errores anteriores antes de verificar', () => {
      crearComponente();
      component.error.set('Error anterior');
      component.code = '123456';

      component.verify();

      expect(component.error()).toBe('');
    });

    it('debe limpiar avisos anteriores antes de verificar', () => {
      crearComponente();
      component.aviso.set('Código anterior enviado');
      component.code = '123456';

      component.verify();

      expect(component.aviso()).toBe('');
    });

    it('debe limpiar el reto MFA al verificar correctamente', () => {
      crearComponente();
      component.code = '123456';

      component.verify();

      expect(clear).toHaveBeenCalledTimes(1);
    });

    it('debe navegar a mis reservas para huéspedes', () => {
      crearComponente();
      component.code = '123456';

      component.verify();

      expect(navigateByUrl).toHaveBeenCalledWith('/mis-reservas');
    });

    it('debe navegar al panel del anfitrión', () => {
      usuario = { role: 'host' };
      loginReal.mockReturnValue(of(usuario));

      crearComponente();
      component.code = '123456';
      component.verify();

      expect(navigateByUrl).toHaveBeenCalledWith('/anfitrion');
    });

    it('debe navegar a administración', () => {
      usuario = { role: 'admin' };
      loginReal.mockReturnValue(of(usuario));

      crearComponente();
      component.code = '123456';
      component.verify();

      expect(navigateByUrl).toHaveBeenCalledWith('/administracion');
    });

    it('debe respetar returnUrl para huéspedes', () => {
      reto = {
        email: 'usuario@correo.com',
        password: 'Clave12345',
        returnUrl: '/favoritos'
      };
      crearComponente();

      component.code = '123456';
      component.verify();

      expect(navigateByUrl).toHaveBeenCalledWith('/favoritos');
    });

    it('debe priorizar el panel del anfitrión sobre returnUrl', () => {
      reto = {
        email: 'usuario@correo.com',
        password: 'Clave12345',
        returnUrl: '/favoritos'
      };
      usuario = { role: 'host' };
      loginReal.mockReturnValue(of(usuario));

      crearComponente();
      component.code = '123456';
      component.verify();

      expect(navigateByUrl).toHaveBeenCalledWith('/anfitrion');
    });

    it('debe priorizar administración sobre returnUrl', () => {
      reto = {
        email: 'usuario@correo.com',
        password: 'Clave12345',
        returnUrl: '/favoritos'
      };
      usuario = { role: 'admin' };
      loginReal.mockReturnValue(of(usuario));

      crearComponente();
      component.code = '123456';
      component.verify();

      expect(navigateByUrl).toHaveBeenCalledWith('/administracion');
    });
  });

  describe('Reenvío del código MFA', () => {
    it('no debe reenviar sin un reto MFA', () => {
      reto = null;
      crearComponente();

      component.reenviar();

      expect(loginReal).not.toHaveBeenCalled();
    });

    it('debe reenviar usando correo y contraseña', () => {
      crearComponente();

      component.reenviar();

      expect(loginReal).toHaveBeenCalledWith(
        'usuario@correo.com',
        'Clave12345'
      );
    });

    it('no debe enviar el código anterior al reenviar', () => {
      crearComponente();
      component.code = '123456';

      component.reenviar();

      expect(loginReal).toHaveBeenCalledWith(
        'usuario@correo.com',
        'Clave12345'
      );
    });

    it('debe activar el estado de envío al reenviar', () => {
      const pendiente = new Subject<any>();
      loginReal.mockReturnValue(pendiente.asObservable());

      crearComponente();
      component.reenviar();

      expect(component.enviando()).toBe(true);

      pendiente.next(usuario);
      pendiente.complete();
    });

    it('debe mostrar aviso cuando se solicita un nuevo código', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(401))
      );
      esPeticionDeCodigo.mockReturnValue(true);

      crearComponente();
      component.reenviar();

      expect(component.aviso()).toBe(
        'Te enviamos un código nuevo. Usa el más reciente.'
      );
    });

    it('debe finalizar el envío después de solicitar un código nuevo', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(401))
      );
      esPeticionDeCodigo.mockReturnValue(true);

      crearComponente();
      component.reenviar();

      expect(component.enviando()).toBe(false);
    });

    it('no debe mostrar error cuando se envía un código nuevo', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(401))
      );
      esPeticionDeCodigo.mockReturnValue(true);

      crearComponente();
      component.reenviar();

      expect(component.error()).toBe('');
    });

    it('debe limpiar errores anteriores al reenviar', () => {
      crearComponente();
      component.error.set('Error anterior');

      component.reenviar();

      expect(component.error()).toBe('');
    });

    it('debe limpiar avisos anteriores al reenviar', () => {
      crearComponente();
      component.aviso.set('Aviso anterior');

      component.reenviar();

      expect(component.aviso()).toBe('');
    });

    it('debe mostrar error si falla el reenvío', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      component.reenviar();

      expect(component.error()).toContain(
        'No se pudo verificar el código'
      );
    });

    it('debe finalizar el proceso si el reenvío autentica directamente', () => {
      crearComponente();

      component.reenviar();

      expect(clear).toHaveBeenCalledTimes(1);
      expect(navigateByUrl).toHaveBeenCalledWith('/mis-reservas');
    });
  });

  describe('Cancelación', () => {
    it('debe limpiar el reto MFA al cancelar', () => {
      crearComponente();

      component.cancel();

      expect(clear).toHaveBeenCalledTimes(1);
    });

    it('debe regresar al inicio de sesión al cancelar', () => {
      crearComponente();

      component.cancel();

      expect(navigate).toHaveBeenCalledWith(['/iniciar-sesion']);
    });

    it('no debe autenticar al cancelar', () => {
      crearComponente();

      component.cancel();

      expect(loginReal).not.toHaveBeenCalled();
    });
  });

  describe('Errores de verificación', () => {
    it('debe mostrar error de conexión', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(0))
      );

      crearComponente();
      component.code = '123456';
      component.verify();

      expect(component.error()).toContain(
        'No se pudo conectar con el servidor'
      );
    });

    it('debe mostrar el mensaje del backend para error 400', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(400, 'Código incorrecto'))
      );

      crearComponente();
      component.code = '123456';
      component.verify();

      expect(component.error()).toBe('Código incorrecto');
    });

    it('debe mostrar error general para estado 401', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(401))
      );

      crearComponente();
      component.code = '123456';
      component.verify();

      expect(component.error()).toContain(
        'No se pudo verificar el código'
      );
    });

    it('debe mostrar error general para estado 500', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      component.code = '123456';
      component.verify();

      expect(component.error()).toContain(
        'No se pudo verificar el código'
      );
    });

    it('debe finalizar el envío cuando ocurre un error', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      component.code = '123456';
      component.verify();

      expect(component.enviando()).toBe(false);
    });

    it('no debe limpiar el reto MFA cuando la verificación falla', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(400, 'Código incorrecto'))
      );

      crearComponente();
      component.code = '123456';
      component.verify();

      expect(clear).not.toHaveBeenCalled();
    });

    it('no debe navegar cuando la verificación falla', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(400, 'Código incorrecto'))
      );

      crearComponente();
      component.code = '123456';
      component.verify();

      expect(navigateByUrl).not.toHaveBeenCalled();
    });

    it('debe permitir reintentar después de un código incorrecto', () => {
      loginReal
        .mockReturnValueOnce(
          throwError(() => crearError(400, 'Código incorrecto'))
        )
        .mockReturnValueOnce(of(usuario));

      crearComponente();

      component.code = '111111';
      component.verify();
      expect(component.error()).toBe('Código incorrecto');

      component.code = '123456';
      component.verify();

      expect(loginReal).toHaveBeenCalledTimes(2);
      expect(component.error()).toBe('');
      expect(navigateByUrl).toHaveBeenCalledWith('/mis-reservas');
    });
  });
});
