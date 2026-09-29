import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'favoritos', canActivate: [authGuard, roleGuard(['guest', 'host'])], loadComponent: () => import('./pages/favorites/favorites.component').then((m) => m.FavoritesComponent), title: 'Favoritos | Lúmina' },
  { path: 'mensajes', canActivate: [authGuard, roleGuard(['guest', 'host'])], loadComponent: () => import('./pages/messages/messages.component').then((m) => m.MessagesComponent), title: 'Mensajes | Lúmina' },
  { path: 'mapas', canActivate: [authGuard], loadComponent: () => import('./pages/maps/maps.component').then((m) => m.MapsComponent), title: 'Mapa | Lúmina' },
  { path: 'seguridad', canActivate: [authGuard], loadComponent: () => import('./pages/security/security.component').then((m) => m.SecurityComponent), title: 'Seguridad | Lúmina' },
  { path: 'verificar-acceso', loadComponent: () => import('./pages/verify/verify.component').then((m) => m.VerifyComponent), title: 'Verificar acceso | Lúmina' },
  { path: '', canActivate: [authGuard], loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent), title: 'Inicio | Lúmina' },
  { path: 'buscar', canActivate: [authGuard], loadComponent: () => import('./pages/search/search.component').then((m) => m.SearchComponent), title: 'Explorar alojamientos | Lúmina' },
  { path: 'alojamientos/:id', canActivate: [authGuard], loadComponent: () => import('./pages/detail/detail.component').then((m) => m.DetailComponent), title: 'Detalle del alojamiento | Lúmina' },
  { path: 'iniciar-sesion', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent), title: 'Iniciar sesión | Lúmina' },
  { path: 'registro', loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent), title: 'Crear cuenta | Lúmina' },
  { path: 'recuperar-clave', loadComponent: () => import('./pages/recover/recover.component').then((m) => m.RecoverComponent), title: 'Recuperar contraseña | Lúmina' },
  { path: 'perfil', canActivate: [authGuard], loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfileComponent), title: 'Mi perfil | Lúmina' },
  { path: 'notificaciones', canActivate: [authGuard], loadComponent: () => import('./pages/notifications/notifications.component').then((m) => m.NotificationsComponent), title: 'Notificaciones | Lúmina' },
  { path: 'mis-reservas', canActivate: [authGuard, roleGuard(['guest', 'host'])], loadComponent: () => import('./pages/guest-bookings/guest-bookings.component').then((m) => m.GuestBookingsComponent), title: 'Mis reservas | Lúmina' },
  { path: 'reservar/:id', canActivate: [authGuard, roleGuard(['guest', 'host'])], loadComponent: () => import('./pages/checkout/checkout.component').then((m) => m.CheckoutComponent), title: 'Confirmar reserva | Lúmina' },
  { path: 'anfitrion', canActivate: [authGuard, roleGuard(['host'])], loadComponent: () => import('./pages/host-dashboard/host-dashboard.component').then((m) => m.HostDashboardComponent), title: 'Panel del anfitrión | Lúmina' },
  { path: 'anfitrion/alojamientos', canActivate: [authGuard, roleGuard(['host'])], loadComponent: () => import('./pages/host-listings/host-listings.component').then((m) => m.HostListingsComponent), title: 'Mis alojamientos | Lúmina' },
  { path: 'anfitrion/alojamientos/nuevo', canActivate: [authGuard, roleGuard(['host'])], loadComponent: () => import('./pages/listing-form/listing-form.component').then((m) => m.ListingFormComponent), title: 'Nuevo alojamiento | Lúmina' },
  { path: 'anfitrion/alojamientos/:id/editar', canActivate: [authGuard, roleGuard(['host'])], loadComponent: () => import('./pages/listing-form/listing-form.component').then((m) => m.ListingFormComponent), title: 'Editar alojamiento | Lúmina' },
  { path: 'anfitrion/disponibilidad', canActivate: [authGuard, roleGuard(['host'])], loadComponent: () => import('./pages/availability/availability.component').then((m) => m.AvailabilityComponent), title: 'Disponibilidad | Lúmina' },
  { path: 'anfitrion/reservas', canActivate: [authGuard, roleGuard(['host'])], loadComponent: () => import('./pages/host-bookings/host-bookings.component').then((m) => m.HostBookingsComponent), title: 'Reservas recibidas | Lúmina' },
  { path: 'administracion', canActivate: [authGuard, roleGuard(['admin'])], loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent), title: 'Administración | Lúmina' },
  { path: 'administracion/usuarios', canActivate: [authGuard, roleGuard(['admin'])], loadComponent: () => import('./pages/admin-users/admin-users.component').then((m) => m.AdminUsersComponent), title: 'Gestión de usuarios | Lúmina' },
  { path: 'administracion/publicaciones', canActivate: [authGuard, roleGuard(['admin'])], loadComponent: () => import('./pages/admin-listings/admin-listings.component').then((m) => m.AdminListingsComponent), title: 'Moderación | Lúmina' },
  { path: 'administracion/auditoria', canActivate: [authGuard, roleGuard(['admin'])], loadComponent: () => import('./pages/audit/audit.component').then((m) => m.AuditComponent), title: 'Auditoría | Lúmina' },
  { path: 'administracion/reportes', canActivate: [authGuard, roleGuard(['admin'])], loadComponent: () => import('./pages/reports/reports.component').then((m) => m.ReportsComponent), title: 'Reportes | Lúmina' },
  { path: '**', canActivate: [authGuard], loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent), title: 'Página no encontrada | Lúmina' }
];
