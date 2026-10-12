
 // @vitest-environment jsdom
import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { MfaService } from './mfa.service';

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

describe('MfaService', () => {
  let service: MfaService;

  beforeEach(() => {
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [MfaService]
    });

    service = TestBed.inject(MfaService);
  });

  describe('Inicializacion', () => {
    it('debe crear el servicio', () => {
      expect(service).toBeTruthy();
    });

    it('debe iniciar sin reto MFA', () => {
      expect(service.challenge()).toBeNull();
    });

    it('debe exponer el reto mediante una signal', () => {
      expect(typeof service.challenge).toBe('function');
    });
  });

  describe('Inicio del reto MFA', () => {
    it('debe guardar el correo electronico', () => {
      service.begin('usuario@test.com', 'clave123', null);

      expect(service.challenge()?.email).toBe('usuario@test.com');
    });

    it('debe guardar la contrasena temporalmente', () => {
      service.begin('usuario@test.com', 'clave123', null);

      expect(service.challenge()?.password).toBe('clave123');
    });

    it('debe guardar la URL de retorno', () => {
      service.begin(
        'usuario@test.com',
        'clave123',
        '/reservas'
      );

      expect(service.challenge()?.returnUrl).toBe('/reservas');
    });

    it('debe permitir una URL de retorno nula', () => {
      service.begin('usuario@test.com', 'clave123', null);

      expect(service.challenge()?.returnUrl).toBeNull();
    });

    it('debe guardar los tres datos del reto', () => {
      service.begin(
        'usuario@test.com',
        'clave123',
        '/perfil'
      );

      expect(service.challenge()).toEqual({
        email: 'usuario@test.com',
        password: 'clave123',
        returnUrl: '/perfil'
      });
    });

    it('debe permitir cambiar el reto pendiente', () => {
      service.begin('primero@test.com', 'clave1', '/inicio');
      service.begin('segundo@test.com', 'clave2', '/perfil');

      expect(service.challenge()).toEqual({
        email: 'segundo@test.com',
        password: 'clave2',
        returnUrl: '/perfil'
      });
    });

    it('debe mantener un solo reto pendiente', () => {
      service.begin('primero@test.com', 'clave1', null);
      service.begin('segundo@test.com', 'clave2', null);

      expect(service.challenge()?.email).toBe('segundo@test.com');
    });

    it('debe conservar exactamente el correo recibido', () => {
      service.begin('  USUARIO@TEST.COM  ', 'clave123', null);

      expect(service.challenge()?.email).toBe('  USUARIO@TEST.COM  ');
    });

    it('debe conservar exactamente la URL recibida', () => {
      service.begin(
        'usuario@test.com',
        'clave123',
        '/alojamientos/101?origen=perfil'
      );

      expect(service.challenge()?.returnUrl)
        .toBe('/alojamientos/101?origen=perfil');
    });
  });

  describe('Limpieza del reto MFA', () => {
    it('debe eliminar un reto pendiente', () => {
      service.begin('usuario@test.com', 'clave123', '/perfil');

      service.clear();

      expect(service.challenge()).toBeNull();
    });

    it('debe permitir limpiar sin un reto pendiente', () => {
      expect(() => service.clear()).not.toThrow();
      expect(service.challenge()).toBeNull();
    });

    it('debe permitir iniciar un nuevo reto despues de limpiar', () => {
      service.begin('primero@test.com', 'clave1', null);
      service.clear();
      service.begin('segundo@test.com', 'clave2', '/inicio');

      expect(service.challenge()?.email).toBe('segundo@test.com');
      expect(service.challenge()?.returnUrl).toBe('/inicio');
    });

    it('debe permitir limpiar varias veces', () => {
      service.begin('usuario@test.com', 'clave123', null);

      service.clear();
      service.clear();

      expect(service.challenge()).toBeNull();
    });
  });

  describe('Deteccion de peticion de codigo MFA', () => {
    const crearError = (
      status: number,
      mensaje: unknown
    ): HttpErrorResponse => {
      return new HttpErrorResponse({
        status,
        error: mensaje,
        statusText: 'Error'
      });
    };

    it('debe reconocer el mensaje de solicitud de codigo', () => {
      const error = crearError(
        400,
        'Se envió un código de verificación'
      );

      expect(service.esPeticionDeCodigo(error)).toBe(true);
    });

    it('debe reconocer el mensaje sin depender de las tildes', () => {
      const error = crearError(
        400,
        'Se envio un codigo de verificacion'
      );

      expect(service.esPeticionDeCodigo(error)).toBe(true);
    });

    it('debe reconocer mensajes con informacion adicional', () => {
      const error = crearError(
        400,
        'Se envió un código al correo registrado'
      );

      expect(service.esPeticionDeCodigo(error)).toBe(true);
    });

    it('debe reconocer exactamente el prefijo esperado', () => {
      const error = crearError(400, 'Se envi');

      expect(service.esPeticionDeCodigo(error)).toBe(true);
    });

    it('debe rechazar errores HTTP 401', () => {
      const error = crearError(
        401,
        'Se envió un código'
      );

      expect(service.esPeticionDeCodigo(error)).toBe(false);
    });

    it('debe rechazar errores HTTP 403', () => {
      const error = crearError(
        403,
        'Se envió un código'
      );

      expect(service.esPeticionDeCodigo(error)).toBe(false);
    });

    it('debe rechazar errores HTTP 500', () => {
      const error = crearError(
        500,
        'Se envió un código'
      );

      expect(service.esPeticionDeCodigo(error)).toBe(false);
    });

    it('debe rechazar errores HTTP 200', () => {
      const error = crearError(
        200,
        'Se envió un código'
      );

      expect(service.esPeticionDeCodigo(error)).toBe(false);
    });

    it('debe rechazar mensajes de error diferentes', () => {
      const error = crearError(
        400,
        'Credenciales incorrectas'
      );

      expect(service.esPeticionDeCodigo(error)).toBe(false);
    });

    it('debe rechazar mensajes vacios', () => {
      const error = crearError(400, '');

      expect(service.esPeticionDeCodigo(error)).toBe(false);
    });

    it('debe rechazar mensajes nulos', () => {
      const error = crearError(400, null);

      expect(service.esPeticionDeCodigo(error)).toBe(false);
    });

    it('debe rechazar respuestas de tipo objeto', () => {
      const error = crearError(400, {
        mensaje: 'Se envió un código'
      });

      expect(service.esPeticionDeCodigo(error)).toBe(false);
    });

    it('debe rechazar respuestas numericas', () => {
      const error = crearError(400, 12345);

      expect(service.esPeticionDeCodigo(error)).toBe(false);
    });

    it('debe rechazar mensajes que empiezan con otro texto', () => {
      const error = crearError(
        400,
        'Aviso: Se envió un código'
      );

      expect(service.esPeticionDeCodigo(error)).toBe(false);
    });

    it('debe distinguir mayusculas y minusculas en el prefijo', () => {
      const error = crearError(
        400,
        'se envió un código'
      );

      expect(service.esPeticionDeCodigo(error)).toBe(false);
    });

    it('debe rechazar mensajes con espacios antes del prefijo', () => {
      const error = crearError(
        400,
        ' Se envió un código'
      );

      expect(service.esPeticionDeCodigo(error)).toBe(false);
    });

    it('debe rechazar un prefijo incompleto', () => {
      const error = crearError(400, 'Se env');

      expect(service.esPeticionDeCodigo(error)).toBe(false);
    });
  });
});
