
 // @vitest-environment jsdom
import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  CatalogService,
  PublicacionBack,
  ResenasPublicacionBack
} from './catalog.service';
import { BookingService } from './booking.service';
import { SessionService } from './session.service';
import { Listing, User } from '../models/marketplace.models';
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

describe('CatalogService', () => {
  let service: CatalogService;

  const usuario = signal<User | null>(null);
  const rol = signal<string>('guest');

  const get = vi.fn();
  const disponible = vi.fn();
  const puedeResenar = vi.fn();
  const marcarResenada = vi.fn();

  const reservas = signal<any[]>([]);

  const sesionSimulada = {
    currentUser: usuario,
    role: rol
  };

  const reservasSimuladas = {
    available: disponible,
    canReview: puedeResenar,
    markReviewed: marcarResenada,
    bookings: reservas
  };

  const httpSimulado = {
    get
  };

  const huesped: User = {
    id: 101,
    name: 'Huesped de prueba',
    email: 'huesped@test.com',
    phone: '',
    role: 'guest',
    active: true,
    joinedAt: '2026-01-01'
  };

  const anfitrion: User = {
    ...huesped,
    id: 202,
    name: 'Anfitrion de prueba',
    role: 'host'
  };

  const administrador: User = {
    ...huesped,
    id: 303,
    name: 'Administrador de prueba',
    role: 'admin'
  };

  const publicacion: PublicacionBack = {
    id: 'uuid-publicacion-1',
    anfitrionId: 'uuid-anfitrion-1',
    titulo: 'Apartamento de prueba',
    descripcion: 'Alojamiento para pruebas',
    ubicacionTextual: 'Calle 100',
    ciudad: 'Bogotá',
    tipo: 'APARTAMENTO',
    capacidad: 4,
    precioNoche: 150000,
    estado: 'ACTIVA',
    servicios: ['Wifi', 'Piscina'],
    reglas: ['No fumar'],
    imagenes: ['imagen1.jpg', 'imagen2.jpg']
  };

  const crearAlojamiento = (
    cambios: Partial<Listing> = {}
  ): Listing => ({
    id: 99991,
    hostId: 202,
    title: 'Apartamento de prueba',
    description: 'Alojamiento para pruebas',
    city: 'Bogotá',
    address: 'Calle 100',
    type: 'Apartamento',
    capacity: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    price: 150000,
    cleaningFee: 20000,
    amenities: ['Wifi', 'Piscina'],
    rules: [],
    image: 'imagen.jpg',
    images: ['imagen.jpg'],
    rating: 0,
    reviewsCount: 0,
    status: 'BORRADOR',
    instantBooking: true,
    cancellationPolicy: 'Flexible',
    ...cambios
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();

    usuario.set(null);
    rol.set('guest');
    reservas.set([]);

    get.mockReturnValue(of([]));
    disponible.mockReturnValue(true);
    puedeResenar.mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        CatalogService,
        { provide: SessionService, useValue: sesionSimulada },
        { provide: BookingService, useValue: reservasSimuladas },
        { provide: HttpClient, useValue: httpSimulado }
      ]
    });

    service = TestBed.inject(CatalogService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  describe('Inicializacion', () => {
    it('debe crear el servicio', () => {
      expect(service).toBeTruthy();
    });

    it('debe iniciar sin resenas nuevas', () => {
      expect(service.reviews()).toEqual([]);
    });

    it('debe exponer el catalogo de alojamientos', () => {
      expect(Array.isArray(service.listings())).toBe(true);
    });

    it('debe iniciar las calificaciones del catalogo en cero', () => {
      expect(
        service.listings().every(
          item => item.rating === 0 && item.reviewsCount === 0
        )
      ).toBe(true);
    });

    it('debe devolver undefined para un alojamiento inexistente', () => {
      expect(service.getById(-999999)).toBeUndefined();
    });
  });

  describe('Conversion de publicaciones del backend', () => {
    it('debe convertir el identificador UUID', () => {
      expect(service.desdeBack(publicacion).uuid).toBe(
        'uuid-publicacion-1'
      );
    });

    it('debe convertir el identificador del anfitrion', () => {
      expect(service.desdeBack(publicacion).hostUuid).toBe(
        'uuid-anfitrion-1'
      );
    });

    it('debe convertir el titulo y la descripcion', () => {
      const resultado = service.desdeBack(publicacion);

      expect(resultado.title).toBe('Apartamento de prueba');
      expect(resultado.description).toBe('Alojamiento para pruebas');
    });

    it('debe convertir la ciudad y la direccion', () => {
      const resultado = service.desdeBack(publicacion);

      expect(resultado.city).toBe('Bogotá');
      expect(resultado.address).toBe('Calle 100');
    });

    it('debe convertir el tipo APARTAMENTO', () => {
      expect(service.desdeBack(publicacion).type).toBe('Apartamento');
    });

    it('debe convertir el tipo CASA', () => {
      expect(
        service.desdeBack({
          ...publicacion,
          tipo: 'CASA'
        }).type
      ).toBe('Casa');
    });

    it('debe convertir HABITACION_PRIVADA', () => {
      expect(
        service.desdeBack({
          ...publicacion,
          tipo: 'HABITACION_PRIVADA'
        }).type
      ).toBe('Habitación privada');
    });

    it('debe convertir HABITACION_COMPARTIDA', () => {
      expect(
        service.desdeBack({
          ...publicacion,
          tipo: 'HABITACION_COMPARTIDA'
        }).type
      ).toBe('Habitación compartida');
    });

    it('debe convertir OTRO', () => {
      expect(
        service.desdeBack({
          ...publicacion,
          tipo: 'OTRO'
        }).type
      ).toBe('Otro');
    });

    it('debe conservar un tipo desconocido', () => {
      expect(
        service.desdeBack({
          ...publicacion,
          tipo: 'TIPO_NUEVO'
        }).type
      ).toBe('TIPO_NUEVO');
    });

    it('debe convertir capacidad y precio', () => {
      const resultado = service.desdeBack(publicacion);

      expect(resultado.capacity).toBe(4);
      expect(resultado.price).toBe(150000);
    });

    it('debe convertir servicios y reglas', () => {
      const resultado = service.desdeBack(publicacion);

      expect(resultado.amenities).toEqual(['Wifi', 'Piscina']);
      expect(resultado.rules).toEqual(['No fumar']);
    });

    it('debe utilizar la primera imagen como principal', () => {
      expect(service.desdeBack(publicacion).image).toBe(
        'imagen1.jpg'
      );
    });

    it('debe conservar todas las imagenes', () => {
      expect(service.desdeBack(publicacion).images).toEqual([
        'imagen1.jpg',
        'imagen2.jpg'
      ]);
    });

    it('debe utilizar imagen predeterminada si no hay imagenes', () => {
      const resultado = service.desdeBack({
        ...publicacion,
        imagenes: []
      });

      expect(resultado.image).toBe('images/interior-purple.svg');
      expect(resultado.images).toEqual([
        'images/interior-purple.svg'
      ]);
    });

    it('debe utilizar listas vacias si faltan servicios y reglas', () => {
      const resultado = service.desdeBack({
        ...publicacion,
        servicios: undefined as unknown as string[],
        reglas: undefined as unknown as string[]
      });

      expect(resultado.amenities).toEqual([]);
      expect(resultado.rules).toEqual([]);
    });

    it('debe conservar el estado de la publicacion', () => {
      expect(service.desdeBack(publicacion).status).toBe('ACTIVA');
    });

    it('debe inicializar las calificaciones en cero', () => {
      const resultado = service.desdeBack(publicacion);

      expect(resultado.rating).toBe(0);
      expect(resultado.reviewsCount).toBe(0);
    });
  });

  describe('Consultas al backend', () => {
    it('debe consultar el detalle de una publicacion', () => {
      get.mockReturnValue(of(publicacion));

      service.obtenerDetalle('uuid-publicacion-1').subscribe();

      expect(get).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/uuid-publicacion-1/detalle`
      );
    });

    it('debe convertir el detalle recibido del backend', () => {
      get.mockReturnValue(of(publicacion));

      let resultado: Listing | undefined;

      service.obtenerDetalle('uuid-publicacion-1').subscribe(
        item => resultado = item
      );

      expect(resultado?.title).toBe('Apartamento de prueba');
      expect(resultado?.uuid).toBe('uuid-publicacion-1');
    });

    it('debe consultar las resenas de una publicacion', () => {
      const respuesta: ResenasPublicacionBack = {
        promedio: 0,
        total: 0,
        resenas: []
      };

      get.mockReturnValue(of(respuesta));

      service.obtenerResenas('uuid-publicacion-1').subscribe();

      expect(get).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/uuid-publicacion-1/resenas`
      );
    });

    it('debe devolver las resenas recibidas', () => {
      const respuesta: ResenasPublicacionBack = {
        promedio: 4.5,
        total: 2,
        resenas: []
      };

      get.mockReturnValue(of(respuesta));

      let resultado: ResenasPublicacionBack | undefined;

      service.obtenerResenas('uuid-publicacion-1').subscribe(
        item => resultado = item
      );

      expect(resultado).toEqual(respuesta);
    });

    it('debe consultar el endpoint de busqueda', () => {
      service.buscarEnBack({}).subscribe();

      expect(get).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/buscar`,
        { params: expect.any(HttpParams) }
      );
    });

    it('debe convertir las publicaciones encontradas', () => {
      get.mockReturnValue(of([publicacion]));

      let resultados: Listing[] = [];

      service.buscarEnBack({}).subscribe(
        items => resultados = items
      );

      expect(resultados).toHaveLength(1);
      expect(resultados[0].title).toBe('Apartamento de prueba');
    });

    it('debe enviar la ciudad sin espacios adicionales', () => {
      service.buscarEnBack({
        city: '  Bogotá  '
      }).subscribe();

      const opciones = get.mock.calls[0][1];

      expect(opciones.params.get('ciudad')).toBe('Bogotá');
    });

    it('debe enviar las fechas de entrada y salida', () => {
      service.buscarEnBack({
        checkIn: '2099-11-10',
        checkOut: '2099-11-12'
      }).subscribe();

      const params = get.mock.calls[0][1].params;

      expect(params.get('desde')).toBe('2099-11-10');
      expect(params.get('hasta')).toBe('2099-11-12');
    });

    it('no debe enviar fechas incompletas', () => {
      service.buscarEnBack({
        checkIn: '2099-11-10'
      }).subscribe();

      const params = get.mock.calls[0][1].params;

      expect(params.has('desde')).toBe(false);
      expect(params.has('hasta')).toBe(false);
    });

    it('debe enviar la capacidad solicitada', () => {
      service.buscarEnBack({
        guests: 3
      }).subscribe();

      const params = get.mock.calls[0][1].params;

      expect(params.get('capacidad')).toBe('3');
    });

    it('debe enviar el tipo de alojamiento', () => {
      service.buscarEnBack({
        type: 'Apartamento'
      }).subscribe();

      const params = get.mock.calls[0][1].params;

      expect(params.get('tipo')).toBe('Apartamento');
    });

    it('debe enviar el precio minimo', () => {
      service.buscarEnBack({
        minPrice: 50000
      }).subscribe();

      const params = get.mock.calls[0][1].params;

      expect(params.get('precioMin')).toBe('50000');
    });

    it('debe enviar el precio maximo personalizado', () => {
      service.buscarEnBack({
        maxPrice: 300000
      }).subscribe();

      const params = get.mock.calls[0][1].params;

      expect(params.get('precioMax')).toBe('300000');
    });

    it('no debe enviar el precio maximo predeterminado', () => {
      service.buscarEnBack({
        maxPrice: 800000
      }).subscribe();

      const params = get.mock.calls[0][1].params;

      expect(params.has('precioMax')).toBe(false);
    });

    it('debe enviar multiples servicios', () => {
      service.buscarEnBack({
        amenities: ['Wifi', 'Piscina']
      }).subscribe();

      const params = get.mock.calls[0][1].params;

      expect(params.getAll('servicios')).toEqual([
        'Wifi',
        'Piscina'
      ]);
    });

    it('no debe enviar capacidad cero', () => {
      service.buscarEnBack({
        guests: 0
      }).subscribe();

      const params = get.mock.calls[0][1].params;

      expect(params.has('capacidad')).toBe(false);
    });
  });

  describe('Busqueda local', () => {
    it('debe devolver alojamientos activos', () => {
      const resultados = service.search({});

      expect(
        resultados.every(item => item.status === 'ACTIVA')
      ).toBe(true);
    });

    it('no debe devolver alojamientos pausados', () => {
      usuario.set(anfitrion);
      rol.set('host');

      service.save(crearAlojamiento({
        status: 'BORRADOR'
      }));

      expect(
        service.search({}).some(item => item.id === 99991)
      ).toBe(false);
    });

    it('debe filtrar por ciudad sin distinguir mayusculas', () => {
      const resultados = service.search({
        city: 'bogotá'
      });

      expect(
        resultados.every(
          item => item.city.toLowerCase().includes('bogotá')
        )
      ).toBe(true);
    });

    it('debe filtrar por capacidad', () => {
      const resultados = service.search({
        guests: 4
      });

      expect(
        resultados.every(item => item.capacity >= 4)
      ).toBe(true);
    });

    it('debe filtrar por tipo de alojamiento', () => {
      const resultados = service.search({
        type: 'Apartamento'
      });

      expect(
        resultados.every(item => item.type === 'Apartamento')
      ).toBe(true);
    });

    it('debe filtrar por precio minimo', () => {
      const resultados = service.search({
        minPrice: 100000
      });

      expect(
        resultados.every(item => item.price >= 100000)
      ).toBe(true);
    });

    it('debe filtrar por precio maximo', () => {
      const resultados = service.search({
        maxPrice: 200000
      });

      expect(
        resultados.every(item => item.price <= 200000)
      ).toBe(true);
    });

    it('debe filtrar por servicios requeridos', () => {
      const resultados = service.search({
        amenities: ['Wifi']
      });

      expect(
        resultados.every(item => item.amenities.includes('Wifi'))
      ).toBe(true);
    });

    it('debe rechazar un rango de fechas invalido', () => {
      const resultados = service.search({
        checkIn: '2099-11-12',
        checkOut: '2099-11-10'
      });

      expect(resultados).toEqual([]);
    });

    it('debe consultar disponibilidad cuando hay fechas', () => {
      service.search({
        checkIn: '2099-11-10',
        checkOut: '2099-11-12'
      });

      expect(disponible).toHaveBeenCalled();
    });

    it('debe excluir alojamientos no disponibles', () => {
      disponible.mockReturnValue(false);

      const resultados = service.search({
        checkIn: '2099-11-10',
        checkOut: '2099-11-12'
      });

      expect(resultados).toEqual([]);
    });
  });

  describe('Guardado de alojamientos', () => {
    beforeEach(() => {
      usuario.set(anfitrion);
      rol.set('host');
    });

    it('debe guardar un alojamiento nuevo', () => {
      const alojamiento = crearAlojamiento();

      service.save(alojamiento);

      expect(service.getById(99991)).toEqual(alojamiento);
    });

    it('debe actualizar un alojamiento existente', () => {
      service.save(crearAlojamiento());

      service.save(crearAlojamiento({
        title: 'Apartamento actualizado'
      }));

      expect(service.getById(99991)?.title).toBe(
        'Apartamento actualizado'
      );
    });

    it('no debe duplicar un alojamiento actualizado', () => {
      service.save(crearAlojamiento());
      service.save(crearAlojamiento({
        title: 'Nueva descripcion'
      }));

      expect(
        service.listings().filter(item => item.id === 99991)
      ).toHaveLength(1);
    });

    it('debe rechazar capacidad cero', () => {
      expect(() => service.save(
        crearAlojamiento({ capacity: 0 })
      )).toThrow('Revisa las cantidades y los precios.');
    });

    it('debe rechazar dormitorios negativos', () => {
      expect(() => service.save(
        crearAlojamiento({ bedrooms: -1 })
      )).toThrow('Revisa las cantidades y los precios.');
    });

    it('debe rechazar camas decimales', () => {
      expect(() => service.save(
        crearAlojamiento({ beds: 1.5 })
      )).toThrow('Revisa las cantidades y los precios.');
    });

    it('debe rechazar banos cero', () => {
      expect(() => service.save(
        crearAlojamiento({ bathrooms: 0 })
      )).toThrow('Revisa las cantidades y los precios.');
    });

    it('debe rechazar precio cero', () => {
      expect(() => service.save(
        crearAlojamiento({ price: 0 })
      )).toThrow('Revisa las cantidades y los precios.');
    });

    it('debe rechazar precio negativo', () => {
      expect(() => service.save(
        crearAlojamiento({ price: -100 })
      )).toThrow('Revisa las cantidades y los precios.');
    });

    it('debe rechazar tarifa de limpieza negativa', () => {
      expect(() => service.save(
        crearAlojamiento({ cleaningFee: -1 })
      )).toThrow('Revisa las cantidades y los precios.');
    });

    it('debe permitir tarifa de limpieza cero', () => {
      service.save(crearAlojamiento({
        cleaningFee: 0
      }));

      expect(service.getById(99991)?.cleaningFee).toBe(0);
    });

    it('no debe permitir guardar si el usuario no es anfitrion', () => {
      usuario.set(huesped);
      rol.set('guest');

      expect(() => service.save(
        crearAlojamiento()
      )).toThrow('No tienes permiso para editar esta publicación.');
    });

    it('no debe permitir guardar alojamientos ajenos', () => {
      expect(() => service.save(
        crearAlojamiento({ hostId: 999 })
      )).toThrow('No tienes permiso para editar esta publicación.');
    });

    it('no debe permitir guardar directamente una publicacion activa', () => {
      expect(() => service.save(
        crearAlojamiento({ status: 'ACTIVA' })
      )).toThrow('No tienes permiso para editar esta publicación.');
    });

    it('debe permitir guardar publicaciones pendientes de revision', () => {
      service.save(crearAlojamiento({
        status: 'PENDIENTE_REVISION'
      }));

      expect(service.getById(99991)?.status).toBe(
        'PENDIENTE_REVISION'
      );
    });
  });

  describe('Estados y permisos', () => {
    it('debe permitir al administrador cambiar el estado', () => {
      usuario.set(anfitrion);
      rol.set('host');
      service.save(crearAlojamiento());

      usuario.set(administrador);
      rol.set('admin');

      service.setStatus(99991, 'ACTIVA');

      expect(service.getById(99991)?.status).toBe('ACTIVA');
    });

    it('debe permitir al anfitrion pausar su alojamiento activo', () => {
      usuario.set(anfitrion);
      rol.set('host');
      service.save(crearAlojamiento());

      usuario.set(administrador);
      rol.set('admin');
      service.setStatus(99991, 'ACTIVA');

      usuario.set(anfitrion);
      rol.set('host');
      service.setStatus(99991, 'PAUSADA');

      expect(service.getById(99991)?.status).toBe('PAUSADA');
    });

    it('debe permitir al anfitrion reactivar su alojamiento', () => {
      usuario.set(anfitrion);
      rol.set('host');
      service.save(crearAlojamiento());

      usuario.set(administrador);
      rol.set('admin');
      service.setStatus(99991, 'PAUSADA');

      usuario.set(anfitrion);
      rol.set('host');
      service.setStatus(99991, 'ACTIVA');

      expect(service.getById(99991)?.status).toBe('ACTIVA');
    });

    it('no debe permitir al huesped cambiar estados', () => {
      usuario.set(anfitrion);
      rol.set('host');
      service.save(crearAlojamiento());

      usuario.set(huesped);
      rol.set('guest');

      service.setStatus(99991, 'ACTIVA');

      expect(service.getById(99991)?.status).toBe('BORRADOR');
    });

    it('no debe permitir al anfitrion cambiar alojamientos ajenos', () => {
      usuario.set(anfitrion);
      rol.set('host');
      service.save(crearAlojamiento());

      usuario.set({
        ...anfitrion,
        id: 888
      });

      service.setStatus(99991, 'ACTIVA');

      expect(service.getById(99991)?.status).toBe('BORRADOR');
    });

    it('debe devolver los alojamientos de un anfitrion', () => {
      usuario.set(anfitrion);
      rol.set('host');
      service.save(crearAlojamiento());

      const resultados = service.hostListings(202);

      expect(
        resultados.some(item => item.id === 99991)
      ).toBe(true);
    });

    it('no debe incluir alojamientos de otros anfitriones', () => {
      usuario.set(anfitrion);
      rol.set('host');
      service.save(crearAlojamiento());

      const resultados = service.hostListings(888);

      expect(
        resultados.some(item => item.id === 99991)
      ).toBe(false);
    });
  });

  describe('Resenas', () => {
    beforeEach(() => {
      usuario.set(anfitrion);
      rol.set('host');
      service.save(crearAlojamiento());

      usuario.set(huesped);
      rol.set('guest');

      reservas.set([{
        id: 7001,
        listingId: 99991
      }]);
    });

    it('debe iniciar sin resenas para el alojamiento', () => {
      expect(service.reviewsFor(99991)).toEqual([]);
    });

    it('debe rechazar resenas sin reserva autorizada', () => {
      puedeResenar.mockReturnValue(false);

      expect(() => service.addReview(
        7001,
        5,
        'Excelente alojamiento'
      )).toThrow(
        'Solo quien hizo una reserva confirmada puede reseñarla una vez.'
      );
    });

    it('debe rechazar calificacion cero', () => {
      expect(() => service.addReview(
        7001,
        0,
        'Comentario'
      )).toThrow(
        'Selecciona entre 1 y 5 estrellas y escribe tu reseña.'
      );
    });

    it('debe rechazar calificacion mayor a cinco', () => {
      expect(() => service.addReview(
        7001,
        6,
        'Comentario'
      )).toThrow(
        'Selecciona entre 1 y 5 estrellas y escribe tu reseña.'
      );
    });

    it('debe rechazar calificaciones decimales', () => {
      expect(() => service.addReview(
        7001,
        4.5,
        'Comentario'
      )).toThrow(
        'Selecciona entre 1 y 5 estrellas y escribe tu reseña.'
      );
    });

    it('debe rechazar comentarios vacios', () => {
      expect(() => service.addReview(
        7001,
        5,
        '   '
      )).toThrow(
        'Selecciona entre 1 y 5 estrellas y escribe tu reseña.'
      );
    });

    it('debe agregar una resena valida', () => {
      service.addReview(7001, 5, 'Excelente alojamiento');

      expect(service.reviewsFor(99991)).toHaveLength(1);
    });

    it('debe guardar el autor de la resena', () => {
      service.addReview(7001, 5, 'Excelente alojamiento');

      expect(service.reviewsFor(99991)[0].author).toBe(
        'Huesped de prueba'
      );
    });

    it('debe eliminar espacios adicionales del comentario', () => {
      service.addReview(7001, 5, '  Excelente alojamiento  ');

      expect(service.reviewsFor(99991)[0].content).toBe(
        'Excelente alojamiento'
      );
    });

    it('debe marcar la reserva como resenada', () => {
      service.addReview(7001, 5, 'Excelente alojamiento');

      expect(marcarResenada).toHaveBeenCalledWith(7001);
    });

    it('debe actualizar el numero de resenas', () => {
      service.addReview(7001, 5, 'Excelente alojamiento');

      expect(service.getById(99991)?.reviewsCount).toBe(1);
    });

    it('debe actualizar la calificacion del alojamiento', () => {
      service.addReview(7001, 5, 'Excelente alojamiento');

      expect(service.getById(99991)?.rating).toBe(5);
    });

    it('no debe permitir resenar el alojamiento propio', () => {
      usuario.set(anfitrion);
      rol.set('host');

      expect(() => service.addReview(
        7001,
        5,
        'Mi alojamiento'
      )).toThrow('No puedes reseñar tu alojamiento.');
    });

    it('debe calcular el promedio de varias resenas', () => {
      reservas.set([
        { id: 7001, listingId: 99991 },
        { id: 7002, listingId: 99991 }
      ]);

      service.addReview(7001, 5, 'Excelente');
      service.addReview(7002, 4, 'Muy bueno');

      expect(service.getById(99991)?.reviewsCount).toBe(2);
      expect(service.getById(99991)?.rating).toBe(4.5);
    });
  });
});
