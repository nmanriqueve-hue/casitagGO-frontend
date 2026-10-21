import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { requiredText, lettersOnly, positiveInteger } from '../../core/models/form-rules';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { concatMap, from, map, of, switchMap, tap, toArray } from 'rxjs';
import { GeoPoint } from '../../core/models/optional.models';
import { PublicacionDatos, PublicacionesBackService } from '../../core/services/publicaciones-back.service';
import { ToastService } from '../../core/services/toast.service';
import { LocationPickerComponent } from '../../shared/location-picker/location-picker.component';

interface FotoNueva {
  archivo: File;
  vista: string;
}

@Component({ selector: 'app-listing-form', imports: [FieldValidationDirective, ReactiveFormsModule, RouterLink, LocationPickerComponent], templateUrl: './listing-form.component.html', styleUrl: './listing-form.component.css' })
export class ListingFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PublicacionesBackService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly editingId: string | null = inject(ActivatedRoute).snapshot.paramMap.get('id');
  // Si la publicación se crea y luego falla algo, los reintentos la editan en vez de duplicarla.
  private idGuardado: string | null = this.editingId;

  readonly step = signal(1);
  readonly guardando = signal(false);
  readonly cargando = signal(false);
  readonly imageError = signal('');
  readonly existentes = signal<string[]>([]);
  readonly nuevas = signal<FotoNueva[]>([]);

  // Punto exacto elegido en el mapa. Si la publicación ya tenía uno guardado, el back solo permite reemplazarlo, no quitarlo.
  readonly punto = signal<GeoPoint | null>(null);
  readonly hayPuntoOriginal = signal(false);

  readonly tipos = [
    { valor: 'APARTAMENTO', nombre: 'Apartamento' },
    { valor: 'CASA', nombre: 'Casa' },
    { valor: 'HABITACION_PRIVADA', nombre: 'Habitación privada' },
    { valor: 'HABITACION_COMPARTIDA', nombre: 'Habitación compartida' },
    { valor: 'OTRO', nombre: 'Otro' }
  ];
  readonly amenityOptions = ['Wi-Fi', 'Cocina', 'Parqueadero', 'Piscina', 'Aire acondicionado', 'Lavadora', 'Espacio de trabajo', 'Jardín'];
  readonly selectedAmenities = signal<string[]>(['Wi-Fi', 'Cocina']);

  readonly form = this.fb.group({
    title: ['', [Validators.required, requiredText(8)]],
    description: ['', [Validators.required, requiredText(30)]],
    city: ['', [Validators.required, lettersOnly]],
    address: ['', [Validators.required, requiredText()]],
    type: ['APARTAMENTO', Validators.required],
    capacity: [2, [Validators.required, positiveInteger]],
    price: [200000, [Validators.required, Validators.min(1)]],
    rules: ['No fumar\nNo se permiten fiestas', [Validators.required, requiredText()]]
  });

  readonly fields = [['title', 'description', 'city', 'address', 'type'], ['capacity'], ['price', 'rules']];

  constructor() {
    if (this.editingId) {
      this.cargando.set(true);
      this.api.mias().subscribe({
        next: (lista) => {
          const publicacion = lista.find((item) => item.id === this.editingId);
          if (!publicacion) {
            this.router.navigate(['/anfitrion/alojamientos']);
            return;
          }
          this.form.patchValue({
            title: publicacion.titulo,
            description: publicacion.descripcion,
            city: publicacion.ciudad,
            address: publicacion.ubicacionTextual,
            type: publicacion.tipo,
            capacity: publicacion.capacidad,
            price: publicacion.precioNoche,
            rules: (publicacion.reglas ?? []).join('\n')
          });
          if (Number.isFinite(publicacion.latitud) && Number.isFinite(publicacion.longitud)) {
            this.punto.set({ latitude: publicacion.latitud as number, longitude: publicacion.longitud as number, label: 'Punto guardado' });
            this.hayPuntoOriginal.set(true);
          }
          this.selectedAmenities.set([...(publicacion.servicios ?? [])]);
          this.existentes.set([...(publicacion.imagenes ?? [])]);
          this.cargando.set(false);
        },
        error: () => this.router.navigate(['/anfitrion/alojamientos'])
      });
    }
  }

  goStep(target: number): void {
    if (target > this.step()) {
      for (let n = 1; n < target; n++) {
        const controls = this.fields[n - 1].map((key) => this.form.get(key)!);
        controls.forEach((c) => c.markAsTouched());
        if (controls.some((c) => c.invalid)) { this.step.set(n); return; }
      }
    }
    this.step.set(target);
  }

  next(): void {
    if (this.step() < 3) this.goStep(this.step() + 1);
  }

  previous(): void {
    if (this.step() > 1) this.step.update((value) => value - 1);
  }

  toggleAmenity(amenity: string): void {
    this.selectedAmenities.update((items) => items.includes(amenity) ? items.filter((item) => item !== amenity) : [...items, amenity]);
  }

  agregarFotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.imageError.set('');
    for (const file of Array.from(input.files ?? [])) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        this.imageError.set('Usa imágenes JPG, PNG o WebP de hasta 5 MB cada una.');
        continue;
      }
      this.nuevas.update((lista) => [...lista, { archivo: file, vista: URL.createObjectURL(file) }]);
    }
    input.value = '';
  }

  quitarFoto(index: number): void {
    const foto = this.nuevas()[index];
    if (foto) { URL.revokeObjectURL(foto.vista); }
    this.nuevas.update((lista) => lista.filter((_, i) => i !== index));
  }

  save(publicar: boolean): void {
    if (this.guardando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const invalidStep = this.fields.findIndex((keys) => keys.some((k) => this.form.get(k)?.invalid));
      if (invalidStep >= 0) this.step.set(invalidStep + 1);
      this.toast.show('Completa los campos obligatorios antes de guardar.', 'warning');
      return;
    }
    if (publicar && this.existentes().length + this.nuevas().length === 0) {
      this.step.set(2);
      this.toast.show('Agrega al menos una foto para publicar.', 'warning');
      return;
    }
    const v = this.form.getRawValue();
    const datos: PublicacionDatos = {
      titulo: (v.title ?? '').trim(),
      descripcion: (v.description ?? '').trim(),
      ubicacionTextual: (v.address ?? '').trim(),
      ciudad: (v.city ?? '').trim(),
      tipo: v.type ?? 'APARTAMENTO',
      capacidad: v.capacity ?? 1,
      precioNoche: v.price ?? 1,
      servicios: this.selectedAmenities(),
      reglas: (v.rules ?? '').split('\n').map((regla) => regla.trim()).filter(Boolean),
      latitud: this.punto()?.latitude ?? null,
      longitud: this.punto()?.longitude ?? null
    };
    this.guardando.set(true);
    const guardar$ = this.idGuardado ? this.api.editar(this.idGuardado, datos) : this.api.crear(datos);
    guardar$.pipe(
      tap((publicacion) => { this.idGuardado = publicacion.id; }),
      switchMap((publicacion) => from(this.nuevas().map((foto) => foto.archivo)).pipe(
        concatMap((archivo) => this.api.subirImagen(publicacion.id, archivo).pipe(
          tap(() => this.nuevas.update((lista) => lista.filter((foto) => foto.archivo !== archivo)))
        )),
        toArray(),
        map(() => publicacion.id)
      )),
      switchMap((id) => publicar ? this.api.activar(id) : of(null))
    ).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toast.show(publicar ? 'La publicación está activa.' : 'El borrador fue guardado.');
        this.router.navigate(['/anfitrion/alojamientos']);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.toast.show(this.mensajeDeError(error), 'warning');
      }
    });
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    if (error.status === 401 || error.status === 403) { return 'Revisa los datos del formulario o vuelve a iniciar sesión.'; }
    return 'No se pudo guardar la publicación. Intenta de nuevo.';
  }
}
