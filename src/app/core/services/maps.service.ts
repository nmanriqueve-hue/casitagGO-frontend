import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { MAPS_CONFIG } from '../config/maps.config';
import { GeoPoint } from '../models/optional.models';
@Injectable({ providedIn: 'root' })
export class MapsService {
  private readonly http = inject(HttpClient);
  private readonly positions = signal<Record<number, GeoPoint>>({});
  private readonly cache = new Map<string, GeoPoint[]>();
  readonly addressSearchEnabled = !!MAPS_CONFIG.geoapifyApiKey;
  async searchAddress(city: string, zone = '', address = ''): Promise<GeoPoint[]> {
    const text = [address.trim(), zone.trim(), city.trim()].filter(Boolean).join(', ');
    if (text.length < 3) return [];
    if (!this.addressSearchEnabled) {
      if (zone.trim() || address.trim()) throw new Error('La búsqueda por dirección y barrio requiere configurar la cuenta del proveedor de mapas. Puedes buscar por ciudad o indicar coordenadas.');
      return this.search(city);
    }
    const key = 'address:' + text.toLowerCase();
    if (this.cache.has(key)) return this.cache.get(key)!;
    const data = await firstValueFrom(this.http.get<{ results?: Array<{ lat: number; lon: number; formatted: string }> }>('https://api.geoapify.com/v1/geocode/search', { params: { text, lang: 'es', limit: 5, format: 'json', bias: 'countrycode:co', apiKey: MAPS_CONFIG.geoapifyApiKey } }).pipe(timeout(10000)));
    const points = (data.results ?? []).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lon)).map(r => ({ latitude: r.lat, longitude: r.lon, label: r.formatted }));
    this.cache.set(key, points); return points;
  }
  private readonly cities: Record<string, GeoPoint> = {
    'Bogotá': { latitude: 4.65, longitude: -74.06, label: 'Bogotá · ubicación aproximada' },
    'Cartagena': { latitude: 10.42, longitude: -75.55, label: 'Cartagena · ubicación aproximada' },
    'Medellín': { latitude: 6.24, longitude: -75.58, label: 'Medellín · ubicación aproximada' },
    'Cali': { latitude: 3.45, longitude: -76.53, label: 'Cali · ubicación aproximada' },
    'Villa de Leyva': { latitude: 5.64, longitude: -73.52, label: 'Villa de Leyva · ubicación aproximada' }
  };
  point(id: number, city: string): GeoPoint | null { return this.positions()[id] ?? this.cities[city] ?? null; }
  save(id: number, point: GeoPoint): void {
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) throw new Error('Coordenadas inválidas.');
    this.positions.update((all) => ({ ...all, [id]: { ...point } }));
  }
  async search(city: string): Promise<GeoPoint[]> {
    const name = city.trim();
    if (name.length < 3) return [];
    if (this.cache.has(name)) return this.cache.get(name)!;
    const data = await firstValueFrom(this.http.get<{ results?: Array<{ latitude: number; longitude: number; name: string; admin1?: string; country?: string }> }>('https://geocoding-api.open-meteo.com/v1/search', { params: { name, count: 5, language: 'es', format: 'json' } }).pipe(timeout(10000)));
    const points = (data.results ?? []).map((r) => ({ latitude: r.latitude, longitude: r.longitude, label: [r.name, r.admin1, r.country].filter(Boolean).join(', ') }));
    this.cache.set(name, points);
    return points;
  }
}
