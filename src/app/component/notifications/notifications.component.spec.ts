
// @vitest-environment jsdom
import '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationsComponent } from './notifications.component';
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

describe('NotificationsComponent', () => {
  let component: NotificationsComponent;
  let cargar: ReturnType<typeof vi.fn>;

  const crearComponente = (): void => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: NotificacionesBackService,
          useValue: { cargar }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new NotificationsComponent()
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    cargar = vi.fn();
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe cargar las notificaciones al iniciar', () => {
      crearComponente();

      expect(cargar).toHaveBeenCalledTimes(1);
    });

    it('debe utilizar el servicio de notificaciones', () => {
      crearComponente();

      expect(component.notificaciones).toBeDefined();
    });

    it('debe conservar la referencia al servicio inyectado', () => {
      crearComponente();

      expect(component.notificaciones.cargar).toBe(cargar);
    });

    it('no debe volver a cargar al consultar un título', () => {
      crearComponente();

      component.titulo('RESERVA_CONFIRMADA');

      expect(cargar).toHaveBeenCalledTimes(1);
    });

    it('no debe volver a cargar al consultar un ícono', () => {
      crearComponente();

      component.icono('RESERVA_CONFIRMADA');

      expect(cargar).toHaveBeenCalledTimes(1);
    });
  });

  describe('Títulos de notificaciones', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe mostrar Reserva confirmada', () => {
      expect(component.titulo('RESERVA_CONFIRMADA')).toBe(
        'Reserva confirmada'
      );
    });

    it('debe mostrar Reserva cancelada', () => {
      expect(component.titulo('RESERVA_CANCELADA')).toBe(
        'Reserva cancelada'
      );
    });

    it('debe convertir un tipo desconocido a texto legible', () => {
      expect(component.titulo('PUBLICACION_APROBADA')).toBe(
        'Publicacion aprobada'
      );
    });

    it('debe reemplazar guiones bajos por espacios', () => {
      expect(component.titulo('NUEVA_SOLICITUD_RECIBIDA')).toBe(
        'Nueva solicitud recibida'
      );
    });

    it('debe convertir las mayúsculas a minúsculas', () => {
      expect(component.titulo('MENSAJE_NUEVO')).toBe(
        'Mensaje nuevo'
      );
    });

    it('debe colocar mayúscula inicial', () => {
      expect(component.titulo('USUARIO_REGISTRADO')).toBe(
        'Usuario registrado'
      );
    });

    it('debe manejar un tipo con una sola palabra', () => {
      expect(component.titulo('AVISO')).toBe('Aviso');
    });

    it('debe manejar texto en minúsculas', () => {
      expect(component.titulo('mensaje')).toBe('Mensaje');
    });

    it('debe manejar una cadena vacía', () => {
      expect(component.titulo('')).toBe('');
    });

    it('debe conservar números en el título', () => {
      expect(component.titulo('ALERTA_2026')).toBe(
        'Alerta 2026'
      );
    });

    it('debe convertir múltiples separadores', () => {
      expect(component.titulo('NUEVA_RESERVA_RECIBIDA')).toBe(
        'Nueva reserva recibida'
      );
    });

    it('debe mantener los títulos especiales definidos', () => {
      expect(component.titulo('RESERVA_CONFIRMADA')).toBe(
        'Reserva confirmada'
      );

      expect(component.titulo('RESERVA_CANCELADA')).toBe(
        'Reserva cancelada'
      );
    });
  });

  describe('Íconos de notificaciones', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe mostrar el ícono de reserva confirmada', () => {
      expect(component.icono('RESERVA_CONFIRMADA')).toBe('⌂');
    });

    it('debe mostrar el ícono de reserva cancelada', () => {
      expect(component.icono('RESERVA_CANCELADA')).toBe('⌂');
    });

    it('debe mostrar el ícono para una nueva reserva', () => {
      expect(component.icono('RESERVA_NUEVA')).toBe('⌂');
    });

    it('debe mostrar el ícono de publicación aprobada', () => {
      expect(component.icono('PUBLICACION_APROBADA')).toBe('◇');
    });

    it('debe mostrar el ícono de publicación rechazada', () => {
      expect(component.icono('PUBLICACION_RECHAZADA')).toBe('◇');
    });

    it('debe mostrar el ícono de publicación pausada', () => {
      expect(component.icono('PUBLICACION_PAUSADA')).toBe('◇');
    });

    it('debe mostrar el ícono de usuario registrado', () => {
      expect(component.icono('USUARIO_REGISTRADO')).toBe('○');
    });

    it('debe mostrar el ícono de usuario bloqueado', () => {
      expect(component.icono('USUARIO_BLOQUEADO')).toBe('○');
    });

    it('debe mostrar el ícono de cuenta verificada', () => {
      expect(component.icono('CUENTA_VERIFICADA')).toBe('○');
    });

    it('debe mostrar el ícono de cuenta suspendida', () => {
      expect(component.icono('CUENTA_SUSPENDIDA')).toBe('○');
    });

    it('debe mostrar el ícono general para mensajes', () => {
      expect(component.icono('MENSAJE_NUEVO')).toBe('✦');
    });

    it('debe mostrar el ícono general para avisos', () => {
      expect(component.icono('AVISO_GENERAL')).toBe('✦');
    });

    it('debe mostrar el ícono general para texto vacío', () => {
      expect(component.icono('')).toBe('✦');
    });

    it('debe reconocer los prefijos de reserva', () => {
      expect(component.icono('RESERVA')).toBe('⌂');
    });

    it('debe reconocer los prefijos de publicación', () => {
      expect(component.icono('PUBLICACION')).toBe('◇');
    });

    it('debe distinguir mayúsculas de minúsculas', () => {
      expect(component.icono('reserva_confirmada')).toBe('✦');
    });
  });

  describe('Formato de fechas', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe devolver vacío para una fecha nula', () => {
      expect(component.fecha(null)).toBe('');
    });

    it('debe devolver vacío para una cadena vacía', () => {
      expect(component.fecha('')).toBe('');
    });

    it('debe devolver vacío para una fecha inválida', () => {
      expect(component.fecha('fecha-invalida')).toBe('');
    });

    it('debe devolver vacío para texto sin formato de fecha', () => {
      expect(component.fecha('no-es-una-fecha')).toBe('');
    });

    it('debe formatear una fecha válida', () => {
      const resultado = component.fecha(
        '2026-10-12T14:30:00'
      );

      expect(resultado).not.toBe('');
    });

    it('debe incluir el año de la fecha', () => {
      const resultado = component.fecha(
        '2026-10-12T14:30:00'
      );

      expect(resultado).toContain('2026');
    });

    it('debe incluir el día de la fecha', () => {
      const resultado = component.fecha(
        '2026-10-12T14:30:00'
      );

      expect(resultado).toMatch(/12/);
    });

    it('debe utilizar el formato colombiano', () => {
      const texto = '2026-10-12T14:30:00';
      const esperado = new Date(texto).toLocaleString(
        'es-CO',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      );

      expect(component.fecha(texto)).toBe(esperado);
    });
  });
});
