import { AfterViewInit, Component, ElementRef, OnDestroy, ViewEncapsulation, effect, inject, input, model, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { GeoPoint } from '../../core/models/optional.models';
import { MapsService } from '../../core/services/maps.service';

@Component({ selector: 'app-location-picker', templateUrl: './location-picker.component.html', styleUrl: './location-picker.component.css', encapsulation: ViewEncapsulation.None })
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
  private readonly maps = inject(MapsService);

  readonly city = input('');
  readonly address = input('');
  readonly permitirQuitar = input(true);
  readonly punto = model<GeoPoint | null>(null);
  readonly contenedor = viewChild.required<ElementRef<HTMLDivElement>>('mapa');

  readonly alternativas = signal<GeoPoint[]>([]);
  readonly buscando = signal(false);
  readonly error = signal('');

  private mapa: L.Map | null = null;
  private marcador: L.Marker | null = null;

  constructor() {
    effect(() => { this.pintar(this.punto()); });
  }

  ngAfterViewInit(): void {
    const inicial = this.punto();
    const centro: L.LatLngExpression = inicial ? [inicial.latitude, inicial.longitude] : [4.57, -74.3];
    this.mapa = L.map(this.contenedor().nativeElement).setView(centro, inicial ? 16 : 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(this.mapa);
    this.mapa.on('click', (evento: L.LeafletMouseEvent) => {
      const posicion = evento.latlng.wrap();
      this.elegir(posicion.lat, posicion.lng);
    });
    this.pintar(inicial);
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
    this.mapa = null;
    this.marcador = null;
  }

  elegir(latitud: number, longitud: number): void {
    this.punto.set({ latitude: this.redondear(latitud), longitude: this.redondear(longitud), label: 'Punto elegido en el mapa' });
    this.alternativas.set([]);
    this.error.set('');
  }

  usarResultado(resultado: GeoPoint): void {
    this.punto.set({ latitude: this.redondear(resultado.latitude), longitude: this.redondear(resultado.longitude), label: resultado.label });
    this.mapa?.setView([resultado.latitude, resultado.longitude], 16);
    this.error.set('');
  }

  elegirAlternativa(resultado: GeoPoint): void {
    this.usarResultado(resultado);
    this.alternativas.set([]);
  }

  quitar(): void {
    if (!this.permitirQuitar()) { return; }
    this.punto.set(null);
    this.alternativas.set([]);
    this.error.set('');
  }

  async buscar(): Promise<void> {
    if (this.buscando()) { return; }
    const ciudad = this.city().trim();
    const direccion = this.address().trim();
    if (ciudad.length < 3 || direccion.length < 3) {
      this.error.set('Escribe la ciudad y la dirección en el primer paso para poder buscarla.');
      return;
    }
    this.error.set('');
    this.alternativas.set([]);
    this.buscando.set(true);
    try {
      const encontrados = await this.maps.buscarDireccion(ciudad, direccion);
      if (encontrados.length === 0) {
        this.error.set('No se encontró esa dirección. Haz clic en el mapa para marcar el punto.');
      } else {
        this.usarResultado(encontrados[0]);
        this.alternativas.set(encontrados.slice(1));
      }
    } catch {
      this.error.set('No se pudo buscar la dirección. Haz clic en el mapa para marcar el punto.');
    } finally {
      this.buscando.set(false);
    }
  }

  private pintar(punto: GeoPoint | null): void {
    if (!this.mapa) { return; }
    if (!punto) {
      this.marcador?.remove();
      this.marcador = null;
      return;
    }
    const posicion: L.LatLngExpression = [punto.latitude, punto.longitude];
    if (this.marcador) {
      this.marcador.setLatLng(posicion);
      return;
    }
    const icono = L.divIcon({ className: 'picker-pin', html: '<span></span>', iconSize: [24, 24], iconAnchor: [12, 29] });
    this.marcador = L.marker(posicion, { draggable: true, icon: icono }).addTo(this.mapa);
    this.marcador.on('dragend', () => {
      const nueva = this.marcador!.getLatLng().wrap();
      this.elegir(nueva.lat, nueva.lng);
    });
  }

  private redondear(valor: number): number {
    return Math.round(valor * 1e6) / 1e6;
  }
}
