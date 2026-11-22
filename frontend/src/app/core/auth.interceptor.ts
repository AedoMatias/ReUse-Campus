
import { inject } from '@angular/core';
import {
  HttpInterceptorFn
} from '@angular/common/http';

import { AuthService } from '../services/auth.service';
import { API_URL } from './api.config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.obtenerToken();

  // Solo enviar el token a nuestra API Express.
  if (!token || !req.url.startsWith(`${API_URL}/`)) {
    return next(req);
  }

  // Agregar el token sin modificar la solicitud original.
  const solicitudAutenticada = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(solicitudAutenticada);
};
