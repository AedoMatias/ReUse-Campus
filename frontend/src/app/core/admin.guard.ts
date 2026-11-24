import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Deja entrar solo a administradores. Sin sesión → login; usuario normal → inicio.
// (El backend vuelve a validar el rol: el guard solo mejora la navegación.)
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.autenticado()) return router.createUrlTree(['/login']);
  if (!auth.esAdministrador()) return router.createUrlTree(['/']);
  return true;
};
