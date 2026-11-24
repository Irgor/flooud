import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        if (req.url.includes('/api/auth/me') || req.url.includes('/api/auth/login')) {
          return throwError(() => error);
        }

        const currentLoginState = authService.isLoggedIn();
        authService.clearSession();
        if (currentLoginState) {
          router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
        
      }

      return throwError(() => error);
    }),
  );
};
