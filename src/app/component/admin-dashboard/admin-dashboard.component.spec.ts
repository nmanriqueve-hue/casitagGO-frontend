
// @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminDashboardComponent } from './admin-dashboard.component';
import {
  AdminBackService,
  DashboardBack
} from '../../core/services/admin-back.service';

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

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let dashboard: ReturnType<typeof vi.fn>;

  // Datos de prueba con todas las propiedades de DashboardBack
  const crearDatos = (
    cambios: Partial<DashboardBack> = {}
  ): DashboardBack => ({
    totalUsuarios: 100,
    usuariosHuespedes: 65,
    usuariosAnfitriones: 30,
    usuariosAdministradores: 5,
    publicacionesActivas: 40,
    reservasPorEstado: {
      CONFIRMADA: 10,
      PENDIENTE: 5,
      COMPLETADA: 3,
      CANCELADA: 2
    },
    ingresosEstimados: 15000000,
    ciudadesConMayorDemanda: [
      { ciudad: 'Bogotá', reservas: 12 },
      { ciudad: 'Medellín', reservas: 8 },
      { ciudad: 'Cali', reservas: 5 }
    ],
    ...cambios
  });

  const errorHttp = (
    status: number,
    error: unknown = null
  ): HttpErrorResponse =>
    new HttpErrorResponse({ status, error });

  const crearComponente = (): void => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AdminBackService,
          useValue: { dashboard }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new AdminDashboardComponent()
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    dashboard = vi.fn().mockReturnValue(of(crearDatos()));
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe consultar el dashboard al iniciar', () => {
      crearComponente();

      expect(dashboard).toHaveBeenCalledTimes(1);
    });

    it('debe cargar los datos del backend', () => {
      crearComponente();

      expect(component.datos()).toEqual(crearDatos());
    });

    it('debe finalizar la carga cuando recibe los datos', () => {
      crearComponente();

      expect(component.cargando()).toBe(false);
    });

    it('debe iniciar sin errores', () => {
      crearComponente();

      expect(component.errorCarga()).toBe('');
    });

    it('debe conservar los datos recibidos', () => {
      const datos = crearDatos();

      dashboard.mockReturnValue(of(datos));
      crearComponente();

      expect(component.datos()).toBe(datos);
    });

    it('debe mantener cargando mientras espera la respuesta', () => {
      const pendiente = new Subject<DashboardBack>();

      dashboard.mockReturnValue(pendiente.asObservable());
      crearComponente();

      expect(component.cargando()).toBe(true);
      expect(component.datos()).toBeNull();

      pendiente.next(crearDatos());
      pendiente.complete();

      expect(component.cargando()).toBe(false);
    });
  });

  describe('Reservas por estado', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe mostrar cuatro estados', () => {
      expect(component.states()).toHaveLength(4);
    });

    it('debe incluir el estado CONFIRMADA', () => {
      expect(component.states()[0].name).toBe('CONFIRMADA');
    });

    it('debe incluir el estado PENDIENTE', () => {
      expect(component.states()[1].name).toBe('PENDIENTE');
    });

    it('debe incluir el estado COMPLETADA', () => {
      expect(component.states()[2].name).toBe('COMPLETADA');
    });

    it('debe incluir el estado CANCELADA', () => {
      expect(component.states()[3].name).toBe('CANCELADA');
    });

    it('debe conservar el orden de los estados', () => {
      expect(component.states().map(item => item.name)).toEqual([
        'CONFIRMADA',
        'PENDIENTE',
        'COMPLETADA',
        'CANCELADA'
      ]);
    });

    it('debe mostrar diez reservas confirmadas', () => {
      expect(component.states()[0].value).toBe(10);
    });

    it('debe mostrar cinco reservas pendientes', () => {
      expect(component.states()[1].value).toBe(5);
    });

    it('debe mostrar tres reservas completadas', () => {
      expect(component.states()[2].value).toBe(3);
    });

    it('debe mostrar dos reservas canceladas', () => {
      expect(component.states()[3].value).toBe(2);
    });

    it('debe mostrar cero para un estado sin datos', () => {
      component.datos.set(
        crearDatos({
          reservasPorEstado: {
            CONFIRMADA: 4
          }
        })
      );

      expect(component.states()[1].value).toBe(0);
      expect(component.states()[2].value).toBe(0);
      expect(component.states()[3].value).toBe(0);
    });
  });

  describe('Indicadores de reservas', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe calcular el total de reservas', () => {
      expect(component.totalReservas()).toBe(20);
    });

    it('debe mostrar las reservas confirmadas', () => {
      expect(component.confirmadas()).toBe(10);
    });

    it('debe actualizar el total cuando cambian los datos', () => {
      component.datos.set(
        crearDatos({
          reservasPorEstado: {
            CONFIRMADA: 2,
            PENDIENTE: 3,
            COMPLETADA: 4,
            CANCELADA: 1
          }
        })
      );

      expect(component.totalReservas()).toBe(10);
    });

    it('debe actualizar las reservas confirmadas', () => {
      component.datos.set(
        crearDatos({
          reservasPorEstado: {
            CONFIRMADA: 25
          }
        })
      );

      expect(component.confirmadas()).toBe(25);
    });

    it('debe calcular cero cuando no hay reservas', () => {
      component.datos.set(
        crearDatos({
          reservasPorEstado: {}
        })
      );

      expect(component.totalReservas()).toBe(0);
    });

    it('debe calcular cero confirmadas cuando no existe el estado', () => {
      component.datos.set(
        crearDatos({
          reservasPorEstado: {}
        })
      );

      expect(component.confirmadas()).toBe(0);
    });

    it('debe actualizar los indicadores al cambiar la señal', () => {
      component.datos.set(
        crearDatos({
          reservasPorEstado: {
            CONFIRMADA: 7,
            PENDIENTE: 1,
            COMPLETADA: 1,
            CANCELADA: 1
          }
        })
      );

      expect(component.totalReservas()).toBe(10);
      expect(component.confirmadas()).toBe(7);
    });
  });

  describe('Ciudades con mayor demanda', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe cargar tres ciudades', () => {
      expect(component.cities()).toHaveLength(3);
    });

    it('debe mostrar Bogotá', () => {
      expect(component.cities()[0].name).toBe('Bogotá');
    });

    it('debe mostrar Medellín', () => {
      expect(component.cities()[1].name).toBe('Medellín');
    });

    it('debe mostrar Cali', () => {
      expect(component.cities()[2].name).toBe('Cali');
    });

    it('debe conservar la cantidad de reservas por ciudad', () => {
      expect(component.cities().map(item => item.value)).toEqual([
        12, 8, 5
      ]);
    });

    it('debe calcular el máximo de reservas por ciudad', () => {
      expect(component.maxCiudad()).toBe(12);
    });

    it('debe utilizar uno como mínimo cuando no hay ciudades', () => {
      component.datos.set(
        crearDatos({
          ciudadesConMayorDemanda: []
        })
      );

      expect(component.maxCiudad()).toBe(1);
    });

    it('debe actualizar las ciudades cuando cambian los datos', () => {
      component.datos.set(
        crearDatos({
          ciudadesConMayorDemanda: [
            { ciudad: 'Cartagena', reservas: 20 }
          ]
        })
      );

      expect(component.cities()).toEqual([
        { name: 'Cartagena', value: 20 }
      ]);
    });

    it('debe actualizar el máximo cuando cambian las ciudades', () => {
      component.datos.set(
        crearDatos({
          ciudadesConMayorDemanda: [
            { ciudad: 'Bogotá', reservas: 30 },
            { ciudad: 'Cali', reservas: 15 }
          ]
        })
      );

      expect(component.maxCiudad()).toBe(30);
    });

    it('debe conservar el orden de las ciudades', () => {
      expect(component.cities().map(item => item.name)).toEqual([
        'Bogotá',
        'Medellín',
        'Cali'
      ]);
    });
  });

  describe('Segmentos de la gráfica', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe generar cuatro segmentos', () => {
      expect(component.segments()).toHaveLength(4);
    });

    it('debe calcular el porcentaje de confirmadas', () => {
      expect(component.segments()[0].length).toBe(50);
    });

    it('debe calcular el porcentaje de pendientes', () => {
      expect(component.segments()[1].length).toBe(25);
    });

    it('debe calcular el porcentaje de completadas', () => {
      expect(component.segments()[2].length).toBe(15);
    });

    it('debe calcular el porcentaje de canceladas', () => {
      expect(component.segments()[3].length).toBe(10);
    });

    it('debe iniciar el primer segmento en cero', () => {
      expect(component.segments()[0].offset).toBe(0);
    });

    it('debe calcular el desplazamiento del segundo segmento', () => {
      expect(component.segments()[1].offset).toBe(50);
    });

    it('debe calcular el desplazamiento del tercer segmento', () => {
      expect(component.segments()[2].offset).toBe(75);
    });

    it('debe calcular el desplazamiento del cuarto segmento', () => {
      expect(component.segments()[3].offset).toBe(90);
    });

    it('debe asignar los colores correspondientes', () => {
      expect(component.segments().map(item => item.color)).toEqual([
        '#7040a0',
        '#ad8bd0',
        '#cbb2df',
        '#e6dbee'
      ]);
    });

    it('debe sumar cien por ciento cuando existen reservas', () => {
      const total = component.segments().reduce(
        (suma, segmento) => suma + segmento.length,
        0
      );

      expect(total).toBe(100);
    });

    it('debe evitar divisiones entre cero', () => {
      component.datos.set(
        crearDatos({
          reservasPorEstado: {}
        })
      );

      expect(
        component.segments().every(
          segmento => Number.isFinite(segmento.length)
        )
      ).toBe(true);
    });

    it('debe generar porcentajes cero cuando no hay reservas', () => {
      component.datos.set(
        crearDatos({
          reservasPorEstado: {}
        })
      );

      expect(component.segments().map(item => item.length)).toEqual([
        0, 0, 0, 0
      ]);
    });
  });

  describe('Errores del backend', () => {
    it('debe mostrar error de conexión para estado 0', () => {
      dashboard.mockReturnValue(
        throwError(() => errorHttp(0))
      );

      crearComponente();

      expect(component.errorCarga()).toContain(
        'No se pudo conectar con el servidor'
      );
    });

    it('debe mostrar el mensaje del backend para error 400', () => {
      dashboard.mockReturnValue(
        throwError(() => errorHttp(400, 'Datos inválidos'))
      );

      crearComponente();

      expect(component.errorCarga()).toBe('Datos inválidos');
    });

    it('debe mostrar error de sesión para estado 401', () => {
      dashboard.mockReturnValue(
        throwError(() => errorHttp(401))
      );

      crearComponente();

      expect(component.errorCarga()).toContain(
        'Tu sesión venció'
      );
    });

    it('debe mostrar error de permisos para estado 403', () => {
      dashboard.mockReturnValue(
        throwError(() => errorHttp(403))
      );

      crearComponente();

      expect(component.errorCarga()).toContain(
        'no tienes permiso'
      );
    });

    it('debe mostrar error general para estado 500', () => {
      dashboard.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();

      expect(component.errorCarga()).toBe(
        'No se pudieron cargar los indicadores. Intenta de nuevo.'
      );
    });

    it('debe detener la carga cuando ocurre un error', () => {
      dashboard.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();

      expect(component.cargando()).toBe(false);
    });

    it('debe mantener los datos vacíos cuando falla la consulta', () => {
      dashboard.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();

      expect(component.datos()).toBeNull();
    });
  });
});
