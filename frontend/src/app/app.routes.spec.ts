import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from './app.routes';
import { API_URL } from './core/api.config';
import { authInterceptor } from './core/auth.interceptor';
import { Solicitud } from './models/solicitud.model';
import { Login } from './pages/login/login';
import { PublicacionForm } from './pages/publicacion-form/publicacion-form';
import { AuthService } from './services/auth.service';

describe('Rutas y solicitudes de ReUse Campus', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    http.verify();
  });

  it.each(['/publicaciones/nueva', '/publicaciones/3/editar', '/mis-solicitudes'])(
    'redirige %s a login cuando no hay sesión',
    async (url) => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(url, Login);
      expect(TestBed.inject(Router).url).toBe('/login');
    },
  );

  function autenticar(): void {
    TestBed.inject(AuthService).login({ correo: 'dueno@example.test', password: 'prueba' }).subscribe();
    http.expectOne({ url: `${API_URL}/auth/login`, method: 'POST' }).flush({
      token: 'jwt-de-prueba',
      usuario: { id: 1, nombre: 'Dueña', correo: 'dueno@example.test', rol: 'USUARIO' },
    });
  }

  it('abre los formularios de publicación con una sesión activa', async () => {
    autenticar();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/publicaciones/nueva', PublicacionForm);
    const edicion = await harness.navigateByUrl('/publicaciones/3/editar', PublicacionForm);
    const consulta = http.expectOne({ url: `${API_URL}/publicaciones/3`, method: 'GET' });
    expect(consulta.request.headers.get('Authorization')).toBe('Bearer jwt-de-prueba');
    consulta.flush({ titulo: 'Libro de cálculo' });
    expect(edicion.formulario.controls.titulo.value).toBe('Libro de cálculo');
  });

  it('acepta con confirmación, envía el JWT y muestra la publicación reservada', async () => {
    const pendiente: Solicitud = {
      id: 2, publicacionId: 3, solicitanteId: 4, propietarioId: 1,
      publicacionTitulo: 'Libro de cálculo', publicacionEstado: 'DISPONIBLE', modalidad: 'DONACION',
      solicitante: 'Bruno', propietario: 'Dueña', mensaje: 'Me sirve para estudiar',
      fechaSolicitud: '2026-11-01', estado: 'PENDIENTE',
    };
    autenticar();
    const harness = await RouterTestingHarness.create('/mis-solicitudes');
    http.expectOne({ url: `${API_URL}/solicitudes`, method: 'GET' }).flush([pendiente]);
    harness.detectChanges();

    const aceptar = [...harness.routeNativeElement!.querySelectorAll('button')]
      .find(boton => boton.textContent.trim() === 'Aceptar')!;
    const confirmacion = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    aceptar.click();
    http.expectNone(`${API_URL}/solicitudes/2/aceptar`);
    aceptar.click();

    const operacion = http.expectOne({ url: `${API_URL}/solicitudes/2/aceptar`, method: 'PATCH' });
    expect(confirmacion).toHaveBeenCalledTimes(2);
    expect(operacion.request.headers.get('Authorization')).toBe('Bearer jwt-de-prueba');
    const aceptada = { ...pendiente, estado: 'ACEPTADA', publicacionEstado: 'RESERVADA' };
    operacion.flush(aceptada);
    http.expectOne({ url: `${API_URL}/solicitudes`, method: 'GET' }).flush([aceptada]);
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('RESERVADA');
    expect(harness.routeNativeElement?.textContent).toContain('Solicitud aceptada');
    expect(harness.routeNativeElement?.querySelector('button')).toBeNull();
  });
});
