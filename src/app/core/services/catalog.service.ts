import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_URL } from '../config/api.config';
import { Listing, SearchFilters, Review } from '../models/marketplace.models';
import { dateRangeError } from '../models/date-rules';
import { BookingService } from './booking.service';
import { SessionService } from './session.service';
import { LISTINGS, REVIEWS } from './mock-data';

export interface PublicacionBack {
  id: string;
  anfitrionId: string;
  anfitrionNombre?: string | null;
  titulo: string;
  descripcion: string;
  ubicacionTextual: string;
  ciudad: string;
  tipo: string;
  capacidad: number;
  precioNoche: number;
  estado: string;
  servicios: string[];
  reglas: string[];
  imagenes: string[];
  latitud?: number | null;
  longitud?: number | null;
}

export interface ResenaBack {
  id: string;
  creadoEn: string | null;
  reservaId: string;
  publicacionId: string;
  huespedNombre: string;
  calificacion: number;
  comentario: string | null;
}

export interface ResenasPublicacionBack {
  promedio: number;
  total: number;
  resenas: ResenaBack[];
}

const TIPOS_ALOJAMIENTO: Record<string, string> = {
  APARTAMENTO: 'Apartamento',
  CASA: 'Casa',
  HABITACION_PRIVADA: 'Habitación privada',
  HABITACION_COMPARTIDA: 'Habitación compartida',
  OTRO: 'Otro'
};

const POLITICA_CANCELACION = 'Reembolso del 100% si cancelas con 3 o más días de anticipación a la llegada. Con menos de 3 días no hay reembolso.';
const IMAGEN_POR_DEFECTO = 'images/interior-purple.svg';
const PRECIO_MAXIMO_POR_DEFECTO = 800000;

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly session = inject(SessionService);
  private readonly bookings = inject(BookingService);
  private readonly http = inject(HttpClient);
  private readonly listingsState = signal<Listing[]>(LISTINGS.map((item) => ({ ...item, rating: 0, reviewsCount: 0 })));
  readonly listings = this.listingsState.asReadonly();
  readonly reviews = signal<(Review & { listingId: number; bookingId: number })[]>([]);
  reviewsFor(id: number) { return this.reviews().filter(r => r.listingId === id); }
  addReview(bookingId: number, rating: number, content: string): void {
    if (!this.bookings.canReview(bookingId)) throw new Error('Solo quien hizo una reserva confirmada puede reseñarla una vez.');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !content.trim()) throw new Error('Selecciona entre 1 y 5 estrellas y escribe tu reseña.');
    const b = this.bookings.bookings().find(x => x.id === bookingId)!;
    const listing = this.getById(b.listingId);
    if (!listing || listing.hostId === this.session.currentUser()?.id) throw new Error('No puedes reseñar tu alojamiento.');
    this.bookings.markReviewed(bookingId);
    this.reviews.update(a => [...a, { id: Math.max(Date.now(), ...this.reviews().map(r => r.id + 1)), bookingId, listingId: b.listingId, author: this.session.currentUser()!.name, rating, content: content.trim(), date: new Date().toLocaleDateString('es-CO') }]);
    const all = this.reviewsFor(b.listingId);
    this.listingsState.update(a => a.map(l => l.id === b.listingId ? { ...l, reviewsCount: all.length, rating: Math.round(all.reduce((sum, r) => sum + r.rating, 0) / all.length * 10) / 10 } : l));
  }

  obtenerDetalle(uuid: string): Observable<Listing> {
    return this.http.get<PublicacionBack>(`${API_URL}/api/publicaciones/${uuid}/detalle`).pipe(
      map((publicacion) => this.desdeBack(publicacion))
    );
  }

  obtenerResenas(uuid: string): Observable<ResenasPublicacionBack> {
    return this.http.get<ResenasPublicacionBack>(`${API_URL}/api/publicaciones/${uuid}/resenas`);
  }

  buscarEnBack(filtros: Partial<SearchFilters>): Observable<Listing[]> {
    let params = new HttpParams();
    if (filtros.city?.trim()) { params = params.set('ciudad', filtros.city.trim()); }
    if (filtros.checkIn && filtros.checkOut) {
      params = params.set('desde', filtros.checkIn).set('hasta', filtros.checkOut);
    }
    if (filtros.guests && filtros.guests > 0) { params = params.set('capacidad', filtros.guests); }
    if (filtros.type) { params = params.set('tipo', filtros.type); }
    if (filtros.minPrice && filtros.minPrice > 0) { params = params.set('precioMin', filtros.minPrice); }
    // 800000 es el valor por defecto del filtro y significa "sin límite".
    if (filtros.maxPrice && filtros.maxPrice > 0 && filtros.maxPrice !== PRECIO_MAXIMO_POR_DEFECTO) {
      params = params.set('precioMax', filtros.maxPrice);
    }
    for (const servicio of filtros.amenities ?? []) { params = params.append('servicios', servicio); }
    return this.http.get<PublicacionBack[]>(`${API_URL}/api/publicaciones/buscar`, { params }).pipe(
      map((lista) => lista.map((publicacion) => this.desdeBack(publicacion)))
    );
  }

  desdeBack(p: PublicacionBack): Listing {
    const imagenes = p.imagenes ?? [];
    return {
      id: 0,
      uuid: p.id,
      hostId: 0,
      hostUuid: p.anfitrionId,
      hostName: p.anfitrionNombre ?? undefined,
      title: p.titulo,
      description: p.descripcion,
      city: p.ciudad,
      address: p.ubicacionTextual,
      type: TIPOS_ALOJAMIENTO[p.tipo] ?? p.tipo,
      capacity: p.capacidad,
      bedrooms: 0,
      beds: 0,
      bathrooms: 0,
      price: p.precioNoche,
      cleaningFee: 0,
      amenities: p.servicios ?? [],
      rules: p.reglas ?? [],
      image: imagenes[0] ?? IMAGEN_POR_DEFECTO,
      images: imagenes.length > 0 ? imagenes : [IMAGEN_POR_DEFECTO],
      rating: 0,
      reviewsCount: 0,
      status: p.estado as Listing['status'],
      instantBooking: true,
      cancellationPolicy: POLITICA_CANCELACION
    };
  }

  getById(id: number): Listing | undefined {
    return this.listingsState().find((item) => item.id === id);
  }

  search(filters: Partial<SearchFilters>): Listing[] {
    if (dateRangeError(filters.checkIn, filters.checkOut, false)) return [];
    return this.listingsState().filter((item) => {
      const dates = !filters.checkIn || !filters.checkOut || this.bookings.available(item.id, filters.checkIn, filters.checkOut);
      const active = item.status === 'ACTIVA';
      const city = !filters.city || item.city.toLowerCase().includes(filters.city.toLowerCase());
      const guests = !filters.guests || item.capacity >= filters.guests;
      const type = !filters.type || item.type === filters.type;
      const min = !filters.minPrice || item.price >= filters.minPrice;
      const max = !filters.maxPrice || item.price <= filters.maxPrice;
      const amenities = !filters.amenities?.length || filters.amenities.every((amenity) => item.amenities.includes(amenity));
      return dates && active && city && guests && type && min && max && amenities;
    });
  }

  save(listing: Listing): void {
    if ([listing.capacity, listing.bedrooms, listing.beds, listing.bathrooms].some(n => !Number.isInteger(n) || n < 1) || !Number.isFinite(listing.price) || listing.price < 1 || !Number.isFinite(listing.cleaningFee) || listing.cleaningFee < 0) throw new Error('Revisa las cantidades y los precios.');
    const existing = this.getById(listing.id);
    if (this.session.role() !== 'host' || listing.hostId !== this.session.currentUser()?.id || (existing && existing.hostId !== listing.hostId) || !['BORRADOR', 'PENDIENTE_REVISION'].includes(listing.status)) throw new Error('No tienes permiso para editar esta publicación.');
    const current = this.listingsState();
    const index = current.findIndex((item) => item.id === listing.id);
    this.listingsState.set(index >= 0 ? current.map((item) => item.id === listing.id ? listing : item) : [listing, ...current]);
  }

  setStatus(id: number, status: Listing['status']): void {
    const l = this.getById(id);
    const hostAllowed = !!l && l.hostId === this.session.currentUser()?.id && this.session.role() === 'host' && ((l.status === 'ACTIVA' && status === 'PAUSADA') || (l.status === 'PAUSADA' && status === 'ACTIVA'));
    if (this.session.role() !== 'admin' && !hostAllowed) return;
    this.listingsState.update((items) => items.map((item) => item.id === id ? { ...item, status } : item));
  }

  hostListings(hostId: number): Listing[] {
    return this.listingsState().filter((item) => item.hostId === hostId);
  }
}


