import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../app.routes';
import { API_URL } from './api.config';
import { AuthService } from '../services/auth.service';

describe('adminGuard', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function iniciarSesion(rol: 'USUARIO' | 'ADMINISTRADOR'): void {
    TestBed.inject(AuthService).login({ correo: 'x@example.test', password: 'prueba' }).subscribe();
    http.expectOne(`${API_URL}/auth/login`).flush({
      token: 'jwt', usuario: { id: 1, nombre: 'Prueba', correo: 'x@example.test', rol },
    });
  }

  it('sin sesión redirige a /login', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin');
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('un usuario normal vuelve al inicio', async () => {
    iniciarSesion('USUARIO');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin');
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('un administrador entra al panel', async () => {
    iniciarSesion('ADMINISTRADOR');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin');
    expect(TestBed.inject(Router).url).toBe('/admin');
  });
});
