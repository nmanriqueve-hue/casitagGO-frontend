import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { addDays, dateRangeError, localToday } from '../../core/models/date-rules';
import { FavoriteButtonComponent } from '../../shared/favorite-button/favorite-button.component';
import { LocationMapComponent } from '../../shared/location-map/location-map.component';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subject, catchError, debounceTime, map, merge, of, switchMap } from 'rxjs';
import { Listing } from '../../core/models/marketplace.models';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { DisponibilidadBackService } from '../../core/services/disponibilidad-back.service';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';

interface ReviewView {
  id: number | string;
  author: string;
  rating: number;
  date: string;
  content: string;
}

interface DisponibilidadVista {
  disponible: boolean;
  mensaje: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MENSAJE_OCUPADO = 'Estas fechas ya están reservadas o bloqueadas por el anfitrión. Elige otro periodo para continuar.';

@Component({ selector: 'app-detail', imports: [FieldValidationDirective, ReactiveFormsModule, CurrencyPipe, RouterLink, FavoriteButtonComponent, LocationMapComponent], templateUrl: './detail.component.html', styleUrl: './detail.component.css' })
export class DetailComponent {
  readonly today = localToday();
  readonly tomorrow = addDays(this.today, 1);
  dateError = '';

  private readonly fb = inject(FormBuilder);
  private readonly disponibilidadApi = inject(DisponibilidadBackService);
  private readonly recomprobar = new Subject<void>();
  readonly listing = signal<Listing | undefined>(undefined);
  readonly cargando = signal(false);
  readonly errorCarga = signal('');
  readonly backReviews = signal<ReviewView[]>([]);
  readonly activeImage = signal(0);
  readonly disponibilidad = signal<DisponibilidadVista | null>(null);
  readonly quoteForm = this.fb.group({ checkIn: [this.today, Validators.required], checkOut: [this.tomorrow, Validators.required], guests: [2, [Validators.required, Validators.min(1)]], extras: [false] });

  quote() {
    const stay = this.listing();
    const value = this.quoteForm.getRawValue();
    if (dateRangeError(value.checkIn, value.checkOut)) return null;
    return stay ? this.bookings.quote(stay, value.checkIn ?? '', value.checkOut ?? '', value.extras ? 45000 : 0) : null;
  }

  constructor(
    route: ActivatedRoute,
    readonly catalog: CatalogService,
    private readonly bookings: BookingService,
    readonly session: SessionService,
    private readonly router: Router,
    private readonly toast: ToastService
  ) {
    merge(this.quoteForm.valueChanges, this.recomprobar).pipe(
      debounceTime(300),
      switchMap(() => this.consultarDisponibilidad()),
      takeUntilDestroyed()
    ).subscribe((resultado) => this.disponibilidad.set(resultado));

    const id = route.snapshot.paramMap.get('id') ?? '';
    if (UUID_REGEX.test(id)) {
      this.cargarDelBack(id);
      return;
    }
    const item = this.catalog.getById(Number(id));
    this.listing.set(item && this.puedeVer(item) ? item : undefined);
  }

  private consultarDisponibilidad(): Observable<DisponibilidadVista | null> {
    const stay = this.listing();
    const v = this.quoteForm.getRawValue();
    if (!stay?.uuid || !this.canReserve() || dateRangeError(v.checkIn, v.checkOut)) { return of(null); }
    return this.disponibilidadApi.consultar(stay.uuid, v.checkIn ?? '', v.checkOut ?? '').pipe(
      map((respuesta): DisponibilidadVista => {
        if (respuesta.disponible) { return { disponible: true, mensaje: '' }; }
        const motivo = respuesta.motivo ?? '';
        return { disponible: false, mensaje: motivo && !motivo.includes('no está disponible') ? motivo : MENSAJE_OCUPADO };
      }),
      catchError(() => of(null))
    );
  }

  private cargarDelBack(uuid: string): void {
    this.cargando.set(true);
    this.catalog.obtenerDetalle(uuid).subscribe({
      next: (item) => {
        this.cargando.set(false);
        if (this.puedeVer(item)) {
          this.listing.set(item);
          this.cargarResenas(uuid);
          this.recomprobar.next();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(this.mensajeDeError(error));
      }
    });
  }

  private cargarResenas(uuid: string): void {
    this.catalog.obtenerResenas(uuid).subscribe({
      next: (datos) => {
        this.backReviews.set(datos.resenas.map((r) => ({
          id: r.id,
          author: r.huespedNombre,
          rating: r.calificacion,
          date: this.formatearFecha(r.creadoEn),
          content: r.comentario ?? ''
        })));
        const actual = this.listing();
        if (actual) { this.listing.set({ ...actual, rating: datos.promedio, reviewsCount: datos.total }); }
      },
      error: () => this.backReviews.set([])
    });
  }

  private puedeVer(item: Listing): boolean {
    const user = this.session.currentUser();
    const esDueno = item.uuid ? item.hostUuid === user?.uuid : item.hostId === user?.id;
    return item.status === 'ACTIVA' || esDueno || this.session.role() === 'admin';
  }

  private formatearFecha(texto: string | null): string {
    if (!texto) { return ''; }
    const fecha = new Date(texto);
    if (isNaN(fecha.getTime())) { return ''; }
    return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    if (error.status === 401 || error.status === 403) { return 'Tu sesión venció. Cierra sesión y vuelve a entrar.'; }
    return 'No se pudo cargar el alojamiento. Intenta de nuevo.';
  }

  reviewList(): ReviewView[] {
    const stay = this.listing();
    if (!stay) { return []; }
    return stay.uuid ? this.backReviews() : this.catalog.reviewsFor(stay.id);
  }

  hostName(): string { return this.session.users().find(u => u.id === this.listing()?.hostId)?.name ?? 'Anfitrión'; }

  canReserve(): boolean {
    const stay = this.listing();
    if (!stay || stay.status !== 'ACTIVA') { return false; }
    if (!['guest', 'host'].includes(this.session.role() ?? '')) { return false; }
    const user = this.session.currentUser();
    return stay.uuid ? stay.hostUuid !== user?.uuid : stay.hostId !== user?.id;
  }

  continueBooking(): void {
    this.quoteForm.markAllAsTouched();
    const stay = this.listing();
    if (!stay) return;
    const idRuta = stay.uuid ?? stay.id;
    const v = this.quoteForm.getRawValue();
    this.dateError = stay.uuid ? (dateRangeError(v.checkIn ?? '', v.checkOut ?? '') || ((v.guests ?? 0) < 1 || (v.guests ?? 0) > stay.capacity ? 'El número de huéspedes supera la capacidad o no es válido.' : '')) : this.bookings.validation(stay, v.checkIn ?? '', v.checkOut ?? '', v.guests ?? 0);
    const estado = this.disponibilidad();
    if (!this.dateError && estado && !estado.disponible) { this.dateError = estado.mensaje; }
    if (this.dateError || this.quoteForm.invalid) return;
    if (!this.session.isAuthenticated()) {
      this.toast.show('Inicia sesión como huésped para continuar.', 'info');
      this.router.navigate(['/iniciar-sesion'], { queryParams: { returnUrl: `/alojamientos/${idRuta}` } });
      return;
    }
    if (!['guest', 'host'].includes(this.session.role() ?? '')) {
      this.toast.show('La reserva está disponible para cuentas de huésped.', 'warning');
      return;
    }
    this.router.navigate(['/reservar', idRuta], { queryParams: this.quoteForm.getRawValue() });
  }
}
