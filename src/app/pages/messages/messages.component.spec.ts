
// @vitest-environment jsdom
import '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessagesComponent } from './messages.component';
import { MessagingService } from '../../core/services/messaging.service';
import { CatalogService } from '../../core/services/catalog.service';
import { SessionService } from '../../core/services/session.service';
import { USERS } from '../../core/services/mock-data';

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

describe('MessagesComponent', () => {
  let component: MessagesComponent;
  let conversations: ReturnType<typeof signal<{ id: number }[]>>;
  let open: ReturnType<typeof vi.fn>;
  let read: ReturnType<typeof vi.fn>;
  let send: ReturnType<typeof vi.fn>;

  const crearConversacion = (id: number) => ({ id });

  const crearComponente = (alojamiento?: string): void => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MessagingService,
          useValue: {
            conversations,
            open,
            read,
            send
          }
        },
        {
          provide: CatalogService,
          useValue: {}
        },
        {
          provide: SessionService,
          useValue: {}
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(
                alojamiento === undefined
                  ? {}
                  : { alojamiento }
              )
            }
          }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new MessagesComponent()
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    conversations = signal([
      crearConversacion(101),
      crearConversacion(102),
      crearConversacion(103)
    ]);

    open = vi.fn().mockReturnValue(null);
    read = vi.fn();
    send = vi.fn().mockReturnValue(true);
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe tener disponible el servicio de mensajería', () => {
      crearComponente();

      expect(component.chat).toBeDefined();
    });

    it('debe tener disponible el catálogo', () => {
      crearComponente();

      expect(component.catalog).toBeDefined();
    });

    it('debe tener disponible la sesión', () => {
      crearComponente();

      expect(component.session).toBeDefined();
    });

    it('debe iniciar con borrador vacío', () => {
      crearComponente();

      expect(component.draft).toBe('');
    });

    it('debe seleccionar la primera conversación disponible', () => {
      crearComponente();

      expect(component.selected()).toBe(101);
    });

    it('debe marcar como leída la primera conversación', () => {
      crearComponente();

      expect(read).toHaveBeenCalledWith(101);
    });

    it('no debe abrir un alojamiento si no existe parámetro', () => {
      crearComponente();

      expect(open).not.toHaveBeenCalled();
    });

    it('debe permanecer sin selección cuando no hay conversaciones', () => {
      conversations.set([]);

      crearComponente();

      expect(component.selected()).toBeNull();
    });

    it('no debe marcar mensajes como leídos cuando no hay conversaciones', () => {
      conversations.set([]);

      crearComponente();

      expect(read).not.toHaveBeenCalled();
    });

    it('debe seleccionar la primera conversación después de un parámetro inválido', () => {
      crearComponente('abc');

      expect(component.selected()).toBe(101);
    });

    it('debe iniciar con borrador vacío después de seleccionar el chat', () => {
      crearComponente();

      expect(component.draft).toBe('');
    });
  });

  describe('Apertura de conversaciones', () => {
    it('debe abrir una conversación desde el parámetro de alojamiento', () => {
      open.mockReturnValue(crearConversacion(205));

      crearComponente('50');

      expect(open).toHaveBeenCalledWith(50);
    });

    it('debe seleccionar la conversación abierta desde la URL', () => {
      open.mockReturnValue(crearConversacion(205));

      crearComponente('50');

      expect(component.selected()).toBe(205);
    });

    it('debe marcar como leída la conversación abierta', () => {
      open.mockReturnValue(crearConversacion(205));

      crearComponente('50');

      expect(read).toHaveBeenCalledWith(205);
    });

    it('debe usar la primera conversación si no se puede abrir la solicitada', () => {
      open.mockReturnValue(null);

      crearComponente('50');

      expect(component.selected()).toBe(101);
    });

    it('debe mantener la conversación abierta aunque no haya otras conversaciones', () => {
      conversations.set([]);
      open.mockReturnValue(crearConversacion(205));

      crearComponente('50');

      expect(component.selected()).toBe(205);
    });

    it('no debe abrir una conversación si el parámetro es cero', () => {
      crearComponente('0');

      expect(open).not.toHaveBeenCalled();
    });

    it('no debe abrir una conversación si el parámetro no es numérico', () => {
      crearComponente('abc');

      expect(open).not.toHaveBeenCalled();
    });

    it('debe abrir una conversación con identificador numérico', () => {
      open.mockReturnValue(crearConversacion(300));

      crearComponente('300');

      expect(open).toHaveBeenCalledWith(300);
    });
  });

  describe('Selección de conversaciones', () => {
    beforeEach(() => {
      crearComponente();
      read.mockClear();
    });

    it('debe cambiar la conversación seleccionada', () => {
      component.select(102);

      expect(component.selected()).toBe(102);
    });

    it('debe marcar como leída la conversación seleccionada', () => {
      component.select(102);

      expect(read).toHaveBeenCalledWith(102);
    });

    it('debe limpiar el borrador al cambiar de conversación', () => {
      component.draft = 'Mensaje anterior';

      component.select(102);

      expect(component.draft).toBe('');
    });

    it('debe permitir seleccionar otra conversación', () => {
      component.select(102);
      component.select(103);

      expect(component.selected()).toBe(103);
    });

    it('debe marcar como leídas las conversaciones seleccionadas', () => {
      component.select(102);
      component.select(103);

      expect(read).toHaveBeenCalledTimes(2);
      expect(read).toHaveBeenNthCalledWith(1, 102);
      expect(read).toHaveBeenNthCalledWith(2, 103);
    });

    it('debe limpiar el borrador incluso al seleccionar el mismo chat', () => {
      component.draft = 'Hola';

      component.select(101);

      expect(component.draft).toBe('');
    });

    it('debe conservar el chat seleccionado hasta cambiarlo', () => {
      component.select(103);

      expect(component.selected()).toBe(103);
      expect(component.selected()).not.toBe(101);
    });
  });

  describe('Identificación de usuarios', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe mostrar el nombre de un usuario existente', () => {
      const usuario = USERS[0];

      expect(component.name(usuario.id)).toBe(usuario.name);
    });

    it('debe mostrar el nombre de otro usuario registrado', () => {
      const usuario = USERS[USERS.length - 1];

      expect(component.name(usuario.id)).toBe(usuario.name);
    });

    it('debe mostrar un identificador cuando el usuario no existe', () => {
      expect(component.name(999999)).toBe('Usuario #999999');
    });

    it('debe mostrar el identificador para un usuario desconocido', () => {
      expect(component.name(888888)).toContain('888888');
    });

    it('debe mantener el formato de usuario desconocido', () => {
      expect(component.name(777777)).toMatch(/^Usuario #/);
    });
  });

  describe('Envío de mensajes', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe enviar un mensaje al chat seleccionado', () => {
      component.draft = 'Hola, ¿está disponible?';

      component.send();

      expect(send).toHaveBeenCalledWith(
        101,
        'Hola, ¿está disponible?'
      );
    });

    it('debe limpiar el borrador cuando el envío es exitoso', () => {
      component.draft = 'Mensaje de prueba';

      component.send();

      expect(component.draft).toBe('');
    });

    it('debe conservar el borrador cuando falla el envío', () => {
      send.mockReturnValue(false);
      component.draft = 'Mensaje pendiente';

      component.send();

      expect(component.draft).toBe('Mensaje pendiente');
    });

    it('no debe enviar mensajes si no hay conversación seleccionada', () => {
      component.selected.set(null);
      component.draft = 'Hola';

      component.send();

      expect(send).not.toHaveBeenCalled();
    });

    it('no debe borrar el borrador cuando no hay conversación', () => {
      component.selected.set(null);
      component.draft = 'Mensaje sin enviar';

      component.send();

      expect(component.draft).toBe('Mensaje sin enviar');
    });

    it('debe enviar al chat que se seleccione posteriormente', () => {
      component.select(102);
      component.draft = 'Mensaje para el segundo chat';

      component.send();

      expect(send).toHaveBeenCalledWith(
        102,
        'Mensaje para el segundo chat'
      );
    });

    it('debe conservar el contenido enviado sin modificarlo', () => {
      component.draft = '  Hola anfitrión  ';

      component.send();

      expect(send).toHaveBeenCalledWith(
        101,
        '  Hola anfitrión  '
      );
    });

    it('debe permitir enviar varios mensajes consecutivos', () => {
      component.draft = 'Primer mensaje';
      component.send();

      component.draft = 'Segundo mensaje';
      component.send();

      expect(send).toHaveBeenCalledTimes(2);
      expect(send).toHaveBeenNthCalledWith(
        1,
        101,
        'Primer mensaje'
      );
      expect(send).toHaveBeenNthCalledWith(
        2,
        101,
        'Segundo mensaje'
      );
    });
  });
});
