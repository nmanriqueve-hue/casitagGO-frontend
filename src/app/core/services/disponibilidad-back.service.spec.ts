
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
  DisponibilidadBackService,
  PeriodoBack,
  DisponibilidadBack
} from './disponibilidad-back.service';
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

describe('DisponibilidadBackService', () => {
  let service: DisponibilidadBackService;
  let httpGet: ReturnType<typeof vi.fn>;
  let httpPost: ReturnType<typeof vi.fn>;
  let httpDelete: ReturnType<typeof vi.fn>;

  const publicacionId = 'publicacion-101';

  const periodosSimulados: PeriodoBack[] = [
    {
      id: 'periodo-1',
      fechaInicio: '2026-11-01',
      fechaFin: '2026-11-05',
      estado: 'BLOQUEADO'
    },
    {
      id: 'periodo-2',
      fechaInicio: '2026-11-10',
      fechaFin: '2026-11-15',
      estado: 'RESERVADO'
    }
  ];

  const disponibilidadSimulada: DisponibilidadBack = {
    publicacionId,
    desde: '2026-11-20',
    hasta: '2026-11-25',
    disponible: true,
    motivo: null
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    httpGet = vi.fn();
    httpPost = vi.fn();
    httpDelete = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        DisponibilidadBackService,
        {
          provide: HttpClient,
          useValue: {
            get: httpGet,
            post: httpPost,
            delete: httpDelete
          }
        }
      ]
    });

    service = TestBed.inject(DisponibilidadBackService);
  });

  describe('Inicialización', () => {
    it('debe crear el servicio correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debe ser una instancia de DisponibilidadBackService', () => {
      expect(service).toBeInstanceOf(DisponibilidadBackService);
    });

    it('no debe realizar solicitudes al inicializarse', () => {
      expect(httpGet).not.toHaveBeenCalled();
      expect(httpPost).not.toHaveBeenCalled();
      expect(httpDelete).not.toHaveBeenCalled();
    });
  });

  describe('Consultar períodos', () => {
    beforeEach(() => {
      httpGet.mockReturnValue(of(periodosSimulados));
    });

    it('debe consultar el endpoint de períodos', async () => {
      await firstValueFrom(service.periodos(publicacionId));

      expect(httpGet).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/${publicacionId}/periodos`
      );
    });

    it('debe devolver los períodos de una publicación', async () => {
      const resultado = await firstValueFrom(
        service.periodos(publicacionId)
      );

      expect(resultado).toEqual(periodosSimulados);
    });

    it('debe devolver múltiples períodos', async () => {
      const resultado = await firstValueFrom(
        service.periodos(publicacionId)
      );

      expect(resultado).toHaveLength(2);
    });

    it('debe conservar el identificador del período', async () => {
      const resultado = await firstValueFrom(
        service.periodos(publicacionId)
      );

      expect(resultado[0].id).toBe('periodo-1');
    });

    it('debe conservar las fechas del período', async () => {
      const resultado = await firstValueFrom(
        service.periodos(publicacionId)
      );

      expect(resultado[0].fechaInicio).toBe('2026-11-01');
      expect(resultado[0].fechaFin).toBe('2026-11-05');
    });

    it('debe conservar el estado del período', async () => {
      const resultado = await firstValueFrom(
        service.periodos(publicacionId)
      );

      expect(resultado[0].estado).toBe('BLOQUEADO');
    });

    it('debe aceptar una lista vacía de períodos', async () => {
      httpGet.mockReturnValue(of([]));

      const resultado = await firstValueFrom(
        service.periodos(publicacionId)
      );

      expect(resultado).toEqual([]);
    });

    it('debe consultar diferentes publicaciones', async () => {
      await firstValueFrom(service.periodos('publicacion-202'));

      expect(httpGet).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/publicacion-202/periodos`
      );
    });

    it('debe propagar errores del backend', async () => {
      httpGet.mockReturnValue(
        throwError(() => new Error('Error al consultar períodos'))
      );

      await expect(
        firstValueFrom(service.periodos(publicacionId))
      ).rejects.toThrow('Error al consultar períodos');
    });
  });

  describe('Bloquear fechas', () => {
    beforeEach(() => {
      httpPost.mockReturnValue(of(periodosSimulados[0]));
    });

    it('debe utilizar el endpoint de bloqueos', async () => {
      await firstValueFrom(
        service.bloquear(publicacionId, '2026-11-01', '2026-11-05')
      );

      expect(httpPost).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/${publicacionId}/bloqueos`,
        {
          fechaInicio: '2026-11-01',
          fechaFin: '2026-11-05'
        }
      );
    });

    it('debe enviar la fecha de inicio', async () => {
      await firstValueFrom(
        service.bloquear(publicacionId, '2026-11-01', '2026-11-05')
      );

      expect(httpPost.mock.calls[0][1].fechaInicio)
        .toBe('2026-11-01');
    });

    it('debe enviar la fecha de finalización', async () => {
      await firstValueFrom(
        service.bloquear(publicacionId, '2026-11-01', '2026-11-05')
      );

      expect(httpPost.mock.calls[0][1].fechaFin)
        .toBe('2026-11-05');
    });

    it('debe devolver el período bloqueado', async () => {
      const resultado = await firstValueFrom(
        service.bloquear(publicacionId, '2026-11-01', '2026-11-05')
      );

      expect(resultado).toEqual(periodosSimulados[0]);
    });

    it('debe conservar el identificador del bloqueo', async () => {
      const resultado = await firstValueFrom(
        service.bloquear(publicacionId, '2026-11-01', '2026-11-05')
      );

      expect(resultado.id).toBe('periodo-1');
    });

    it('debe conservar el estado del bloqueo', async () => {
      const resultado = await firstValueFrom(
        service.bloquear(publicacionId, '2026-11-01', '2026-11-05')
      );

      expect(resultado.estado).toBe('BLOQUEADO');
    });

    it('debe permitir bloquear un solo día', async () => {
      await firstValueFrom(
        service.bloquear(publicacionId, '2026-11-01', '2026-11-01')
      );

      expect(httpPost.mock.calls[0][1]).toEqual({
        fechaInicio: '2026-11-01',
        fechaFin: '2026-11-01'
      });
    });

    it('debe enviar fechas de diferentes meses', async () => {
      await firstValueFrom(
        service.bloquear(publicacionId, '2026-11-28', '2026-12-03')
      );

      expect(httpPost.mock.calls[0][1]).toEqual({
        fechaInicio: '2026-11-28',
        fechaFin: '2026-12-03'
      });
    });

    it('debe utilizar el identificador correcto de publicación', async () => {
      await firstValueFrom(
        service.bloquear('publicacion-202', '2026-11-01', '2026-11-05')
      );

      expect(httpPost.mock.calls[0][0]).toBe(
        `${API_URL}/api/publicaciones/publicacion-202/bloqueos`
      );
    });

    it('debe propagar errores al bloquear', async () => {
      httpPost.mockReturnValue(
        throwError(() => new Error('Error al bloquear'))
      );

      await expect(
        firstValueFrom(
          service.bloquear(publicacionId, '2026-11-01', '2026-11-05')
        )
      ).rejects.toThrow('Error al bloquear');
    });
  });

  describe('Liberar bloqueos', () => {
    beforeEach(() => {
      httpDelete.mockReturnValue(of('Bloqueo eliminado'));
    });

    it('debe consultar el endpoint de liberación', async () => {
      await firstValueFrom(
        service.liberar(publicacionId, 'periodo-1')
      );

      expect(httpDelete).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/${publicacionId}/bloqueos/periodo-1`,
        { responseType: 'text' }
      );
    });

    it('debe enviar el identificador del período', async () => {
      await firstValueFrom(
        service.liberar(publicacionId, 'periodo-2')
      );

      expect(httpDelete.mock.calls[0][0]).toContain('periodo-2');
    });

    it('debe utilizar el identificador de publicación', async () => {
      await firstValueFrom(
        service.liberar('publicacion-202', 'periodo-1')
      );

      expect(httpDelete.mock.calls[0][0]).toBe(
        `${API_URL}/api/publicaciones/publicacion-202/bloqueos/periodo-1`
      );
    });

    it('debe solicitar respuesta de tipo texto', async () => {
      await firstValueFrom(
        service.liberar(publicacionId, 'periodo-1')
      );

      expect(httpDelete.mock.calls[0][1]).toEqual({
        responseType: 'text'
      });
    });

    it('debe devolver la respuesta del backend', async () => {
      const resultado = await firstValueFrom(
        service.liberar(publicacionId, 'periodo-1')
      );

      expect(resultado).toBe('Bloqueo eliminado');
    });

    it('debe aceptar una respuesta vacía', async () => {
      httpDelete.mockReturnValue(of(''));

      const resultado = await firstValueFrom(
        service.liberar(publicacionId, 'periodo-1')
      );

      expect(resultado).toBe('');
    });

    it('debe propagar errores al liberar', async () => {
      httpDelete.mockReturnValue(
        throwError(() => new Error('Error al liberar'))
      );

      await expect(
        firstValueFrom(
          service.liberar(publicacionId, 'periodo-1')
        )
      ).rejects.toThrow('Error al liberar');
    });
  });

  describe('Consultar disponibilidad', () => {
    beforeEach(() => {
      httpGet.mockReturnValue(of(disponibilidadSimulada));
    });

    it('debe consultar el endpoint de disponibilidad', async () => {
      await firstValueFrom(
        service.consultar(publicacionId, '2026-11-20', '2026-11-25')
      );

      expect(httpGet).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/${publicacionId}/disponibilidad`,
        {
          params: {
            desde: '2026-11-20',
            hasta: '2026-11-25'
          }
        }
      );
    });

    it('debe enviar la fecha desde', async () => {
      await firstValueFrom(
        service.consultar(publicacionId, '2026-11-20', '2026-11-25')
      );

      expect(httpGet.mock.calls[0][1].params.desde)
        .toBe('2026-11-20');
    });

    it('debe enviar la fecha hasta', async () => {
      await firstValueFrom(
        service.consultar(publicacionId, '2026-11-20', '2026-11-25')
      );

      expect(httpGet.mock.calls[0][1].params.hasta)
        .toBe('2026-11-25');
    });

    it('debe devolver la disponibilidad de la publicación', async () => {
      const resultado = await firstValueFrom(
        service.consultar(publicacionId, '2026-11-20', '2026-11-25')
      );

      expect(resultado).toEqual(disponibilidadSimulada);
    });

    it('debe identificar fechas disponibles', async () => {
      const resultado = await firstValueFrom(
        service.consultar(publicacionId, '2026-11-20', '2026-11-25')
      );

      expect(resultado.disponible).toBe(true);
    });

    it('debe identificar fechas no disponibles', async () => {
      httpGet.mockReturnValue(of({
        ...disponibilidadSimulada,
        disponible: false,
        motivo: 'Fechas ocupadas'
      }));

      const resultado = await firstValueFrom(
        service.consultar(publicacionId, '2026-11-20', '2026-11-25')
      );

      expect(resultado.disponible).toBe(false);
    });

    it('debe devolver el motivo de indisponibilidad', async () => {
      httpGet.mockReturnValue(of({
        ...disponibilidadSimulada,
        disponible: false,
        motivo: 'Fechas ocupadas'
      }));

      const resultado = await firstValueFrom(
        service.consultar(publicacionId, '2026-11-20', '2026-11-25')
      );

      expect(resultado.motivo).toBe('Fechas ocupadas');
    });

    it('debe aceptar un motivo nulo', async () => {
      const resultado = await firstValueFrom(
        service.consultar(publicacionId, '2026-11-20', '2026-11-25')
      );

      expect(resultado.motivo).toBeNull();
    });

    it('debe aceptar respuestas sin motivo', async () => {
      httpGet.mockReturnValue(of({
        publicacionId,
        desde: '2026-11-20',
        hasta: '2026-11-25',
        disponible: true
      }));

      const resultado = await firstValueFrom(
        service.consultar(publicacionId, '2026-11-20', '2026-11-25')
      );

      expect(resultado.motivo).toBeUndefined();
    });

    it('debe propagar errores al consultar disponibilidad', async () => {
      httpGet.mockReturnValue(
        throwError(() => new Error('Error de disponibilidad'))
      );

      await expect(
        firstValueFrom(
          service.consultar(publicacionId, '2026-11-20', '2026-11-25')
        )
      ).rejects.toThrow('Error de disponibilidad');
    });
  });
});
