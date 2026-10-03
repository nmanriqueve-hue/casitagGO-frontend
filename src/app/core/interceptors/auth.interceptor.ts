import { HttpInterceptorFn } from '@angular/common/http';
import { API_URL } from '../config/api.config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('casitago_token');
  if (token && req.url.startsWith(API_URL)) {
    const conToken = req.clone({ setHeaders: { Authorization: 'Bearer ' + token } });
    return next(conToken);
  }
  return next(req);
};
