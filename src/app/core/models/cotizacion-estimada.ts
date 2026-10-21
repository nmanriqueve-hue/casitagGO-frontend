import { Quote } from './marketplace.models';

// Misma formula que usa el back en POST /api/reservas/cotizacion (RF-17).
// Solo es un estimado para mostrar en el detalle; el total oficial lo da el back.
export const TARIFA_LIMPIEZA_BACK = 25000;
export const PORCENTAJE_SERVICIO_BACK = 0.05;

export function estimarCotizacion(precioNoche: number, llegada: string, salida: string, extras = 0): Quote {
  const inicio = new Date(`${llegada}T12:00:00`).getTime();
  const fin = new Date(`${salida}T12:00:00`).getTime();
  const nights = Math.max(1, Math.round((fin - inicio) / 86400000) || 1);
  const base = nights * precioNoche;
  const service = Math.round(base * PORCENTAJE_SERVICIO_BACK);
  return {
    nights,
    base,
    cleaning: TARIFA_LIMPIEZA_BACK,
    service,
    extras,
    discount: 0,
    total: base + TARIFA_LIMPIEZA_BACK + service + extras
  };
}
