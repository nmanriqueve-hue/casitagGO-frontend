
// @vitest-environment jsdom
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { ToastService } from './toast.service';

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

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [ToastService]
    });

    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  describe('Inicializacion', () => {
    it('debe crear el servicio', () => {
      expect(service).toBeTruthy();
    });

    it('debe iniciar sin mensajes', () => {
      expect(service.message()).toBeNull();
    });

    it('debe exponer el mensaje mediante una signal', () => {
      expect(typeof service.message).toBe('function');
    });
  });

  describe('Mostrar notificaciones', () => {
    it('debe mostrar un mensaje', () => {
      service.show('Operacion completada');

      expect(service.message()?.text).toBe('Operacion completada');
    });

    it('debe usar success como tono predeterminado', () => {
      service.show('Guardado correctamente');

      expect(service.message()?.tone).toBe('success');
    });

    it('debe mostrar una notificacion success', () => {
      service.show('Registro exitoso', 'success');

      expect(service.message()).toEqual({
        text: 'Registro exitoso',
        tone: 'success'
      });
    });

    it('debe mostrar una notificacion info', () => {
      service.show('Informacion disponible', 'info');

      expect(service.message()).toEqual({
        text: 'Informacion disponible',
        tone: 'info'
      });
    });

    it('debe mostrar una notificacion warning', () => {
      service.show('Verifica los datos', 'warning');

      expect(service.message()).toEqual({
        text: 'Verifica los datos',
        tone: 'warning'
      });
    });

    it('debe conservar exactamente el texto recibido', () => {
      service.show('  Mensaje con espacios  ');

      expect(service.message()?.text)
        .toBe('  Mensaje con espacios  ');
    });

    it('debe permitir mensajes vacios', () => {
      service.show('');

      expect(service.message()?.text).toBe('');
    });

    it('debe permitir mensajes extensos', () => {
      const texto = 'Mensaje de prueba '.repeat(100);

      service.show(texto);

      expect(service.message()?.text).toBe(texto);
    });

    it('debe permitir caracteres especiales', () => {
      service.show('¡Reserva confirmada! #101');

      expect(service.message()?.text)
        .toBe('¡Reserva confirmada! #101');
    });

    it('debe reemplazar un mensaje anterior', () => {
      service.show('Primer mensaje');
      service.show('Segundo mensaje');

      expect(service.message()?.text).toBe('Segundo mensaje');
    });

    it('debe actualizar el tono al reemplazar el mensaje', () => {
      service.show('Correcto', 'success');
      service.show('Advertencia', 'warning');

      expect(service.message()?.tone).toBe('warning');
    });

    it('debe permitir mostrar un mensaje despues de otro', () => {
      service.show('Primero');
      service.show('Segundo');
      service.show('Tercero');

      expect(service.message()?.text).toBe('Tercero');
    });
  });

  describe('Cierre manual', () => {
    it('debe cerrar una notificacion activa', () => {
      service.show('Mensaje visible');

      service.close();

      expect(service.message()).toBeNull();
    });

    it('debe permitir cerrar sin mensaje activo', () => {
      expect(() => service.close()).not.toThrow();

      expect(service.message()).toBeNull();
    });

    it('debe permitir cerrar varias veces', () => {
      service.show('Mensaje');

      service.close();
      service.close();

      expect(service.message()).toBeNull();
    });

    it('debe permitir mostrar otro mensaje despues de cerrar', () => {
      service.show('Primero');
      service.close();
      service.show('Segundo');

      expect(service.message()?.text).toBe('Segundo');
    });

    it('debe conservar el estado cerrado si no hay otro mensaje', () => {
      service.show('Mensaje');
      service.close();

      vi.advanceTimersByTime(3200);

      expect(service.message()).toBeNull();
    });
  });

  describe('Desaparicion automatica', () => {
    it('debe mantener el mensaje antes de 3200 milisegundos', () => {
      service.show('Mensaje temporal');

      vi.advanceTimersByTime(3199);

      expect(service.message()?.text).toBe('Mensaje temporal');
    });

    it('debe desaparecer exactamente a los 3200 milisegundos', () => {
      service.show('Mensaje temporal');

      vi.advanceTimersByTime(3200);

      expect(service.message()).toBeNull();
    });

    it('debe desaparecer despues de 4 segundos', () => {
      service.show('Mensaje temporal');

      vi.advanceTimersByTime(4000);

      expect(service.message()).toBeNull();
    });

    it('debe permanecer visible despues de 1 segundo', () => {
      service.show('Mensaje temporal');

      vi.advanceTimersByTime(1000);

      expect(service.message()).not.toBeNull();
    });

    it('debe reiniciar el temporizador al mostrar otro mensaje', () => {
      service.show('Primero');

      vi.advanceTimersByTime(2000);

      service.show('Segundo');

      vi.advanceTimersByTime(2000);

      expect(service.message()?.text).toBe('Segundo');
    });

    it('debe ocultar el segundo mensaje despues de su propio tiempo', () => {
      service.show('Primero');

      vi.advanceTimersByTime(2000);

      service.show('Segundo');

      vi.advanceTimersByTime(3200);

      expect(service.message()).toBeNull();
    });

    it('debe cancelar el temporizador anterior', () => {
      service.show('Primero');

      vi.advanceTimersByTime(1000);

      service.show('Segundo');

      expect(vi.getTimerCount()).toBe(1);
    });

    it('debe mantener un unico temporizador tras varios mensajes', () => {
      service.show('Uno');
      service.show('Dos');
      service.show('Tres');

      expect(vi.getTimerCount()).toBe(1);
    });

    it('debe eliminar el temporizador al cumplirse el tiempo', () => {
      service.show('Mensaje');

      vi.advanceTimersByTime(3200);

      expect(vi.getTimerCount()).toBe(0);
    });

    it('debe permitir mostrar otra notificacion despues de expirar', () => {
      service.show('Primero');

      vi.advanceTimersByTime(3200);

      service.show('Segundo');

      expect(service.message()?.text).toBe('Segundo');
    });

    it('debe aplicar el mismo tiempo a las notificaciones warning', () => {
      service.show('Advertencia', 'warning');

      vi.advanceTimersByTime(3200);

      expect(service.message()).toBeNull();
    });

    it('debe aplicar el mismo tiempo a las notificaciones info', () => {
      service.show('Informacion', 'info');

      vi.advanceTimersByTime(3200);

      expect(service.message()).toBeNull();
    });

    it('debe mantener el ultimo mensaje si se reemplaza antes de expirar', () => {
      service.show('Primero');

      vi.advanceTimersByTime(3100);

      service.show('Segundo');

      vi.advanceTimersByTime(200);

      expect(service.message()?.text).toBe('Segundo');
    });

    it('debe ocultar el ultimo mensaje cuando vence su temporizador', () => {
      service.show('Primero');

      vi.advanceTimersByTime(3100);

      service.show('Segundo');

      vi.advanceTimersByTime(3200);

      expect(service.message()).toBeNull();
    });
  });
});
