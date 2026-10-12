
// @vitest-environment jsdom
import '@angular/compiler';

import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ReservasBackService,
  CotizacionBack,
  ReservaBack,
  ReservaRecibidaBack,
  PagoBack,
  CancelacionBack
} from './reservas-back.service';
import { API_URL } from '../config/api.config';

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

describe('ReservasBackService', () => {
  let service: ReservasBackService;
  let httpPost: ReturnType<typeof vi.fn>;
  let httpGet: ReturnType<typeof vi.fn>;
  let httpPatch: ReturnType<typeof vi.fn>;

  const cotizacion: CotizacionBack = {
    id: 'cotizacion-101',
    creadoEn: '2026-10-12T10:00:00',
    publicacionId: 'publicacion-101',
    noches: 3,
    precioBase: 450000,
    tarifaLimpieza: 30000,
    tarifaServicio: 20000,
    serviciosAdicionales: 15000,
    total: 515000
  };

  const reserva: ReservaBack = {
    id: 'reserva-101',
    creadoEn: '2026-10-12T11:00:00',
    publicacionId: 'publicacion-101',
    fechaLlegada: '2026-11-10',
    fechaSalida: '2026-11-13',
    estado: 'PENDIENTE',
    total: 515000
  };

  const segundaReserva: ReservaBack = {
    id: 'reserva-202',
    creadoEn: null,
    publicacionId: 'publicacion-202',
    fechaLlegada: '2026-12-01',
    fechaSalida: '2026-12-05',
    estado: 'CONFIRMADA',
    total: 800000
  };

  const reservaRecibida: ReservaRecibidaBack = {
    ...reserva,
    tituloPublicacion: 'Apartamento en Bogotá',
    huespedNombre: 'María Pérez'
  };

  const pago: PagoBack = {
    estado: 'APROBADO'
  };

  const cancelacion: CancelacionBack = {
    id: 'cancelacion-101',
    creadoEn: '2026-10-12T12:00:00',
    reservaId: 'reserva-101',
    motivo: 'Cambio de planes',
    valorDevolucion: 400000,
    estadoFinal: 'CANCELADA'
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    httpPost = vi.fn();
    httpGet = vi.fn();
    httpPatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        ReservasBackService,
        {
          provide: HttpClient,
          useValue: {
            post: httpPost,
            get: httpGet,
            patch: httpPatch
          }
        }
      ]
    });

    service = TestBed.inject(ReservasBackService);
  });

  describe('Inicialización', () => {
    it('debe crear el servicio correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debe ser una instancia de ReservasBackService', () => {
      expect(service).toBeInstanceOf(ReservasBackService);
    });

    it('no debe realizar solicitudes al inicializarse', () => {
      expect(httpPost).not.toHaveBeenCalled();
      expect(httpGet).not.toHaveBeenCalled();
      expect(httpPatch).not.toHaveBeenCalled();
    });
  });

  describe('Cotizar reserva', () => {
    beforeEach(() => {
      httpPost.mockReturnValue(of(cotizacion));
    });

    it('debe consultar el endpoint de cotización', async () => {
      await firstValueFrom(
        service.cotizar(
          'publicacion-101',
          '2026-11-10',
          '2026-11-13',
          15000
        )
      );

      expect(httpPost).toHaveBeenCalledWith(
        `${API_URL}/api/reservas/cotizacion`,
        {
          publicacionId: 'publicacion-101',
          fechaLlegada: '2026-11-10',
          fechaSalida: '2026-11-13',
          serviciosAdicionales: 15000
        }
      );
    });

    it('debe realizar una solicitud POST', async () => {
      await firstValueFrom(
        service.cotizar('publicacion-101', '2026-11-10', '2026-11-13', 0)
      );

      expect(httpPost).toHaveBeenCalledTimes(1);
    });

    it('debe enviar el identificador de publicación', async () => {
      await firstValueFrom(
        service.cotizar('publicacion-202', '2026-11-10', '2026-11-13', 0)
      );

      expect(httpPost.mock.calls[0][1].publicacionId)
        .toBe('publicacion-202');
    });

    it('debe enviar la fecha de llegada', async () => {
      await firstValueFrom(
        service.cotizar('publicacion-101', '2026-11-10', '2026-11-13', 0)
      );

      expect(httpPost.mock.calls[0][1].fechaLlegada)
        .toBe('2026-11-10');
    });

    it('debe enviar la fecha de salida', async () => {
      await firstValueFrom(
        service.cotizar('publicacion-101', '2026-11-10', '2026-11-13', 0)
      );

      expect(httpPost.mock.calls[0][1].fechaSalida)
        .toBe('2026-11-13');
    });

    it('debe enviar el valor de servicios adicionales', async () => {
      await firstValueFrom(
        service.cotizar('publicacion-101', '2026-11-10', '2026-11-13', 25000)
      );

      expect(httpPost.mock.calls[0][1].serviciosAdicionales)
        .toBe(25000);
    });

    it('debe aceptar servicios adicionales en cero', async () => {
      await firstValueFrom(
        service.cotizar('publicacion-101', '2026-11-10', '2026-11-13', 0)
      );

      expect(httpPost.mock.calls[0][1].serviciosAdicionales)
        .toBe(0);
    });

    it('debe devolver la cotización recibida', async () => {
      const resultado = await firstValueFrom(
        service.cotizar('publicacion-101', '2026-11-10', '2026-11-13', 15000)
      );

      expect(resultado).toEqual(cotizacion);
    });

    it('debe conservar el número de noches', async () => {
      const resultado = await firstValueFrom(
        service.cotizar('publicacion-101', '2026-11-10', '2026-11-13', 15000)
      );

      expect(resultado.noches).toBe(3);
    });

    it('debe conservar el precio base', async () => {
      const resultado = await firstValueFrom(
        service.cotizar('publicacion-101', '2026-11-10', '2026-11-13', 15000)
      );

      expect(resultado.precioBase).toBe(450000);
    });

    it('debe conservar las tarifas adicionales', async () => {
      const resultado = await firstValueFrom(
        service.cotizar('publicacion-101', '2026-11-10', '2026-11-13', 15000)
      );

      expect(resultado.tarifaLimpieza).toBe(30000);
      expect(resultado.tarifaServicio).toBe(20000);
    });

    it('debe conservar el total cotizado', async () => {
      const resultado = await firstValueFrom(
        service.cotizar('publicacion-101', '2026-11-10', '2026-11-13', 15000)
      );

      expect(resultado.total).toBe(515000);
    });

    it('debe propagar errores de cotización', async () => {
      httpPost.mockReturnValue(
        throwError(() => new Error('Error de cotización'))
      );

      await expect(
        firstValueFrom(
          service.cotizar('publicacion-101', '2026-11-10', '2026-11-13', 0)
        )
      ).rejects.toThrow('Error de cotización');
    });
  });

  describe('Crear reserva', () => {
    beforeEach(() => {
      httpPost.mockReturnValue(of(reserva));
    });

    it('debe consultar el endpoint de reservas', async () => {
      await firstValueFrom(
        service.crearReserva('cotizacion-101', '2026-11-10', '2026-11-13')
      );

      expect(httpPost).toHaveBeenCalledWith(
        `${API_URL}/api/reservas`,
        {
          cotizacionId: 'cotizacion-101',
          fechaLlegada: '2026-11-10',
          fechaSalida: '2026-11-13'
        }
      );
    });

    it('debe realizar una solicitud POST', async () => {
      await firstValueFrom(
        service.crearReserva('cotizacion-101', '2026-11-10', '2026-11-13')
      );

      expect(httpPost).toHaveBeenCalledTimes(1);
    });

    it('debe enviar el identificador de cotización', async () => {
      await firstValueFrom(
        service.crearReserva('cotizacion-202', '2026-11-10', '2026-11-13')
      );

      expect(httpPost.mock.calls[0][1].cotizacionId)
        .toBe('cotizacion-202');
    });

    it('debe enviar ambas fechas', async () => {
      await firstValueFrom(
        service.crearReserva('cotizacion-101', '2026-11-10', '2026-11-13')
      );

      expect(httpPost.mock.calls[0][1]).toEqual({
        cotizacionId: 'cotizacion-101',
        fechaLlegada: '2026-11-10',
        fechaSalida: '2026-11-13'
      });
    });

    it('debe devolver la reserva creada', async () => {
      const resultado = await firstValueFrom(
        service.crearReserva('cotizacion-101', '2026-11-10', '2026-11-13')
      );

      expect(resultado).toEqual(reserva);
    });

    it('debe conservar el estado de la reserva', async () => {
      const resultado = await firstValueFrom(
        service.crearReserva('cotizacion-101', '2026-11-10', '2026-11-13')
      );

      expect(resultado.estado).toBe('PENDIENTE');
    });

    it('debe conservar el total de la reserva', async () => {
      const resultado = await firstValueFrom(
        service.crearReserva('cotizacion-101', '2026-11-10', '2026-11-13')
      );

      expect(resultado.total).toBe(515000);
    });

    it('debe propagar errores al crear una reserva', async () => {
      httpPost.mockReturnValue(
        throwError(() => new Error('Error al crear reserva'))
      );

      await expect(
        firstValueFrom(
          service.crearReserva('cotizacion-101', '2026-11-10', '2026-11-13')
        )
      ).rejects.toThrow('Error al crear reserva');
    });
  });

  describe('Pagar reserva', () => {
    beforeEach(() => {
      httpPost.mockReturnValue(of(pago));
    });

    it('debe consultar el endpoint de pago', async () => {
      await firstValueFrom(service.pagar('reserva-101', 'TARJETA'));

      expect(httpPost).toHaveBeenCalledWith(
        `${API_URL}/api/reservas/reserva-101/pagar`,
        { metodoPago: 'TARJETA' }
      );
    });

    it('debe realizar una solicitud POST', async () => {
      await firstValueFrom(service.pagar('reserva-101', 'TARJETA'));

      expect(httpPost).toHaveBeenCalledTimes(1);
    });

    it('debe enviar el identificador correcto de reserva', async () => {
      await firstValueFrom(service.pagar('reserva-202', 'TARJETA'));

      expect(httpPost.mock.calls[0][0]).toBe(
        `${API_URL}/api/reservas/reserva-202/pagar`
      );
    });

    it('debe enviar el método de pago', async () => {
      await firstValueFrom(service.pagar('reserva-101', 'PSE'));

      expect(httpPost.mock.calls[0][1].metodoPago).toBe('PSE');
    });

    it('debe devolver el resultado del pago', async () => {
      const resultado = await firstValueFrom(
        service.pagar('reserva-101', 'TARJETA')
      );

      expect(resultado).toEqual(pago);
    });

    it('debe conservar el estado del pago', async () => {
      const resultado = await firstValueFrom(
        service.pagar('reserva-101', 'TARJETA')
      );

      expect(resultado.estado).toBe('APROBADO');
    });

    it('debe aceptar respuestas sin estado', async () => {
      httpPost.mockReturnValue(of({}));

      const resultado = await firstValueFrom(
        service.pagar('reserva-101', 'TARJETA')
      );

      expect(resultado.estado).toBeUndefined();
    });

    it('debe propagar errores al pagar', async () => {
      httpPost.mockReturnValue(
        throwError(() => new Error('Error de pago'))
      );

      await expect(
        firstValueFrom(service.pagar('reserva-101', 'TARJETA'))
      ).rejects.toThrow('Error de pago');
    });
  });

  describe('Consultar mis reservas', () => {
    beforeEach(() => {
      httpGet.mockReturnValue(of([reserva, segundaReserva]));
    });

    it('debe consultar el endpoint de reservas propias', async () => {
      await firstValueFrom(service.misReservas());

      expect(httpGet).toHaveBeenCalledWith(
        `${API_URL}/api/reservas/mias`
      );
    });

    it('debe devolver las reservas del usuario', async () => {
      const resultado = await firstValueFrom(service.misReservas());

      expect(resultado).toEqual([reserva, segundaReserva]);
    });

    it('debe devolver varias reservas', async () => {
      const resultado = await firstValueFrom(service.misReservas());

      expect(resultado).toHaveLength(2);
    });

    it('debe conservar los identificadores', async () => {
      const resultado = await firstValueFrom(service.misReservas());

      expect(resultado.map((r) => r.id))
        .toEqual(['reserva-101', 'reserva-202']);
    });

    it('debe conservar los estados de las reservas', async () => {
      const resultado = await firstValueFrom(service.misReservas());

      expect(resultado.map((r) => r.estado))
        .toEqual(['PENDIENTE', 'CONFIRMADA']);
    });

    it('debe aceptar una lista vacía', async () => {
      httpGet.mockReturnValue(of([]));

      const resultado = await firstValueFrom(service.misReservas());

      expect(resultado).toEqual([]);
    });

    it('debe propagar errores al consultar mis reservas', async () => {
      httpGet.mockReturnValue(
        throwError(() => new Error('Error al consultar reservas'))
      );

      await expect(firstValueFrom(service.misReservas()))
        .rejects.toThrow('Error al consultar reservas');
    });
  });

  describe('Consultar reservas recibidas', () => {
    beforeEach(() => {
      httpGet.mockReturnValue(of([reservaRecibida]));
    });

    it('debe consultar el endpoint de reservas recibidas', async () => {
      await firstValueFrom(service.recibidas());

      expect(httpGet).toHaveBeenCalledWith(
        `${API_URL}/api/reservas/recibidas`
      );
    });

    it('debe devolver las reservas recibidas', async () => {
      const resultado = await firstValueFrom(service.recibidas());

      expect(resultado).toEqual([reservaRecibida]);
    });

    it('debe conservar el título de la publicación', async () => {
      const resultado = await firstValueFrom(service.recibidas());

      expect(resultado[0].tituloPublicacion)
        .toBe('Apartamento en Bogotá');
    });

    it('debe conservar el nombre del huésped', async () => {
      const resultado = await firstValueFrom(service.recibidas());

      expect(resultado[0].huespedNombre).toBe('María Pérez');
    });

    it('debe aceptar una lista vacía', async () => {
      httpGet.mockReturnValue(of([]));

      const resultado = await firstValueFrom(service.recibidas());

      expect(resultado).toEqual([]);
    });

    it('debe propagar errores al consultar reservas recibidas', async () => {
      httpGet.mockReturnValue(
        throwError(() => new Error('Error en reservas recibidas'))
      );

      await expect(firstValueFrom(service.recibidas()))
        .rejects.toThrow('Error en reservas recibidas');
    });
  });

  describe('Cancelar reserva', () => {
    beforeEach(() => {
      httpPatch.mockReturnValue(of(cancelacion));
    });

    it('debe consultar el endpoint de cancelación', async () => {
      await firstValueFrom(
        service.cancelar('reserva-101', 'Cambio de planes')
      );

      expect(httpPatch).toHaveBeenCalledWith(
        `${API_URL}/api/reservas/reserva-101/cancelar`,
        { motivo: 'Cambio de planes' }
      );
    });

    it('debe realizar una solicitud PATCH', async () => {
      await firstValueFrom(
        service.cancelar('reserva-101', 'Cambio de planes')
      );

      expect(httpPatch).toHaveBeenCalledTimes(1);
    });

    it('debe utilizar el identificador correcto', async () => {
      await firstValueFrom(
        service.cancelar('reserva-202', 'Cambio de planes')
      );

      expect(httpPatch.mock.calls[0][0]).toBe(
        `${API_URL}/api/reservas/reserva-202/cancelar`
      );
    });

    it('debe enviar el motivo de cancelación', async () => {
      await firstValueFrom(
        service.cancelar('reserva-101', 'Emergencia personal')
      );

      expect(httpPatch.mock.calls[0][1].motivo)
        .toBe('Emergencia personal');
    });

    it('debe devolver la cancelación recibida', async () => {
      const resultado = await firstValueFrom(
        service.cancelar('reserva-101', 'Cambio de planes')
      );

      expect(resultado).toEqual(cancelacion);
    });

    it('debe conservar el valor de devolución', async () => {
      const resultado = await firstValueFrom(
        service.cancelar('reserva-101', 'Cambio de planes')
      );

      expect(resultado.valorDevolucion).toBe(400000);
    });

    it('debe conservar el estado final', async () => {
      const resultado = await firstValueFrom(
        service.cancelar('reserva-101', 'Cambio de planes')
      );

      expect(resultado.estadoFinal).toBe('CANCELADA');
    });

    it('debe propagar errores al cancelar', async () => {
      httpPatch.mockReturnValue(
        throwError(() => new Error('Error al cancelar'))
      );

      await expect(
        firstValueFrom(
          service.cancelar('reserva-101', 'Cambio de planes')
        )
      ).rejects.toThrow('Error al cancelar');
    });
  });
});
