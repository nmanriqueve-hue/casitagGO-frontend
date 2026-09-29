import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/marketplace.models';
import { ToastService } from '../services/toast.service';
import { SessionService } from '../services/session.service';

export const roleGuard = (roles: UserRole[]): CanActivateFn => () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.role() && roles.includes(session.role() as UserRole)) return true;
  inject(ToastService).show('Tu rol no tiene acceso a esta función.', 'warning');
  return router.createUrlTree([session.role() === 'admin' ? '/administracion' : session.role() === 'host' ? '/anfitrion' : '/mis-reservas']);
};
