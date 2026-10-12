
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
  AdminBackService,
  DashboardBack,
  EventoAuditoriaBack
} from './admin-back.service';
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

describe('AdminBackService', () => {
  let service: AdminBackService;
  let httpGet: ReturnType<typeof vi.fn>;

  const dashboardSimulado: DashboardBack = {
    totalUsuarios: 120,
    usuariosHuespedes: 80,
    usuariosAnfitriones: 35,
    usuariosAdministradores: 5,
    publicacionesActivas: 45,
    reservasPorEstado: {
      PENDIENTE: 10,
      CONFIRMADA: 25,
      CANCELADA: 5
    },
    ingresosEstimados: 12500000,
    ciudadesConMayorDemanda: [
      { ciudad: 'Bogotá', reservas: 30 },
      { ciudad: 'Medellín', reservas: 20 },
      { ciudad: 'Cartagena', reservas: 15 }
    ]
  };

  const eventosSimulados: EventoAuditoriaBack[] = [
    {
      id: 'evento-1',
      creadoEn: '2026-10-01T10:00:00',
      usuarioId: 'usuario-1',
      entidad: 'PUBLICACION',
      accion: 'CREAR',
      resultado: 'EXITOSO',
      detalle: { publicacionId: 'publicacion-1' }
    },
    {
      id: 'evento-2',
      creadoEn: null,
      usuarioId: null,
      entidad: 'RESERVA',
      accion: 'CANCELAR',
      resultado: 'EXITOSO',
      detalle: null
    }
  ];

  beforeEach(() => {
    TestBed.resetTestingModule();

    httpGet = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AdminBackService,
        {
          provide: HttpClient,
          useValue: { get: httpGet }
        }
      ]
    });

    service = TestBed.inject(AdminBackService);
  });

  describe('Inicialización', () => {
    it('debe crear el servicio', () => {
      expect(service).toBeTruthy();
    });

    it('debe ser una instancia de AdminBackService', () => {
      expect(service).toBeInstanceOf(AdminBackService);
    });

    it('no debe consultar el backend al inicializarse', () => {
      expect(httpGet).not.toHaveBeenCalled();
    });
  });

  describe('Dashboard administrativo', () => {
    beforeEach(() => {
      httpGet.mockReturnValue(of(dashboardSimulado));
    });

    it('debe consultar el endpoint del dashboard', async () => {
      await firstValueFrom(service.dashboard());

      expect(httpGet).toHaveBeenCalledWith(
        `${API_URL}/api/admin/dashboard`
      );
    });

    it('debe realizar una solicitud GET', async () => {
      await firstValueFrom(service.dashboard());

      expect(httpGet).toHaveBeenCalledTimes(1);
    });

    it('debe devolver los datos del dashboard', async () => {
      const resultado = await firstValueFrom(service.dashboard());

      expect(resultado).toEqual(dashboardSimulado);
    });

    it('debe devolver el total de usuarios', async () => {
      const resultado = await firstValueFrom(service.dashboard());

      expect(resultado.totalUsuarios).toBe(120);
    });

    it('debe devolver los usuarios huéspedes', async () => {
      const resultado = await firstValueFrom(service.dashboard());

      expect(resultado.usuariosHuespedes).toBe(80);
    });

    it('debe devolver los usuarios anfitriones', async () => {
      const resultado = await firstValueFrom(service.dashboard());

      expect(resultado.usuariosAnfitriones).toBe(35);
    });

    it('debe devolver los usuarios administradores', async () => {
      const resultado = await firstValueFrom(service.dashboard());

      expect(resultado.usuariosAdministradores).toBe(5);
    });

    it('debe devolver las publicaciones activas', async () => {
      const resultado = await firstValueFrom(service.dashboard());

      expect(resultado.publicacionesActivas).toBe(45);
    });

    it('debe devolver las reservas agrupadas por estado', async () => {
      const resultado = await firstValueFrom(service.dashboard());

      expect(resultado.reservasPorEstado).toEqual({
        PENDIENTE: 10,
        CONFIRMADA: 25,
        CANCELADA: 5
      });
    });

    it('debe devolver los ingresos estimados', async () => {
      const resultado = await firstValueFrom(service.dashboard());

      expect(resultado.ingresosEstimados).toBe(12500000);
    });

    it('debe devolver las ciudades con mayor demanda', async () => {
      const resultado = await firstValueFrom(service.dashboard());

      expect(resultado.ciudadesConMayorDemanda).toHaveLength(3);
    });

    it('debe conservar los datos de cada ciudad', async () => {
      const resultado = await firstValueFrom(service.dashboard());

      expect(resultado.ciudadesConMayorDemanda[0]).toEqual({
        ciudad: 'Bogotá',
        reservas: 30
      });
    });

    it('debe aceptar un dashboard con valores en cero', async () => {
      httpGet.mockReturnValue(of({
        ...dashboardSimulado,
        totalUsuarios: 0,
        publicacionesActivas: 0,
        ingresosEstimados: 0
      }));

      const resultado = await firstValueFrom(service.dashboard());

      expect(resultado.totalUsuarios).toBe(0);
      expect(resultado.publicacionesActivas).toBe(0);
      expect(resultado.ingresosEstimados).toBe(0);
    });

    it('debe aceptar una lista de ciudades vacía', async () => {
      httpGet.mockReturnValue(of({
        ...dashboardSimulado,
        ciudadesConMayorDemanda: []
      }));

      const resultado = await firstValueFrom(service.dashboard());

      expect(resultado.ciudadesConMayorDemanda).toEqual([]);
    });

    it('debe propagar errores del backend', async () => {
      httpGet.mockReturnValue(
        throwError(() => new Error('Error del dashboard'))
      );

      await expect(firstValueFrom(service.dashboard()))
        .rejects.toThrow('Error del dashboard');
    });
  });

  describe('Eventos de auditoría', () => {
    beforeEach(() => {
      httpGet.mockReturnValue(of(eventosSimulados));
    });

    it('debe consultar el endpoint de auditoría', async () => {
      await firstValueFrom(service.auditoria());

      expect(httpGet).toHaveBeenCalledWith(
        `${API_URL}/api/admin/auditoria`
      );
    });

    it('debe realizar una solicitud GET', async () => {
      await firstValueFrom(service.auditoria());

      expect(httpGet).toHaveBeenCalledTimes(1);
    });

    it('debe devolver los eventos de auditoría', async () => {
      const resultado = await firstValueFrom(service.auditoria());

      expect(resultado).toEqual(eventosSimulados);
    });

    it('debe conservar los identificadores de eventos', async () => {
      const resultado = await firstValueFrom(service.auditoria());

      expect(resultado.map(evento => evento.id))
        .toEqual(['evento-1', 'evento-2']);
    });

    it('debe conservar la información de cada evento', async () => {
      const resultado = await firstValueFrom(service.auditoria());

      expect(resultado[0]).toEqual(eventosSimulados[0]);
    });

    it('debe permitir campos opcionales nulos', async () => {
      const resultado = await firstValueFrom(service.auditoria());

      expect(resultado[1].creadoEn).toBeNull();
      expect(resultado[1].usuarioId).toBeNull();
      expect(resultado[1].detalle).toBeNull();
    });

    it('debe devolver una lista vacía cuando no hay eventos', async () => {
      httpGet.mockReturnValue(of([]));

      const resultado = await firstValueFrom(service.auditoria());

      expect(resultado).toEqual([]);
    });

    it('debe propagar errores de auditoría', async () => {
      httpGet.mockReturnValue(
        throwError(() => new Error('Error de auditoría'))
      );

      await expect(firstValueFrom(service.auditoria()))
        .rejects.toThrow('Error de auditoría');
    });
  });

  describe('Reporte de gestión', () => {
    it('debe consultar el endpoint de reportes', async () => {
      httpGet.mockReturnValue(of(new Blob(['reporte'])));

      await firstValueFrom(service.reporteGestion());

      expect(httpGet).toHaveBeenCalledWith(
        `${API_URL}/api/admin/reportes/gestion`,
        { responseType: 'blob' }
      );
    });

    it('debe solicitar la respuesta como Blob', async () => {
      httpGet.mockReturnValue(of(new Blob(['reporte'])));

      await firstValueFrom(service.reporteGestion());

      expect(httpGet.mock.calls[0][1]).toEqual({
        responseType: 'blob'
      });
    });

    it('debe devolver un archivo Blob', async () => {
      const archivo = new Blob(['Contenido del reporte'], {
        type: 'application/pdf'
      });

      httpGet.mockReturnValue(of(archivo));

      const resultado = await firstValueFrom(
        service.reporteGestion()
      );

      expect(resultado).toBeInstanceOf(Blob);
      expect(resultado).toBe(archivo);
    });

    it('debe permitir un archivo vacío', async () => {
      httpGet.mockReturnValue(of(new Blob([])));

      const resultado = await firstValueFrom(
        service.reporteGestion()
      );

      expect(resultado.size).toBe(0);
    });

    it('debe propagar errores al descargar el reporte', async () => {
      httpGet.mockReturnValue(
        throwError(() => new Error('Error al descargar'))
      );

      await expect(firstValueFrom(service.reporteGestion()))
        .rejects.toThrow('Error al descargar');
    });
  });
});
