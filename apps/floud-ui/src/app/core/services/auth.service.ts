import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { finalize, Observable, of, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface AuthUserData {
  email: string;
  password: string;
}

@Service()
export class AuthService {
  private http = inject(HttpClient);

  private baseUrl = window.location.origin + '/api/auth';

  user = signal<any | null>(null);
  isLoggedIn = computed(() => !!this.user()?.id);

  loadUser() {
    return this.profile()
      .pipe(
        catchError((_) => {
          return of(null);
        }),
        tap(user => {
          this.user.set(user);
        })
      )
  }

  signUp(email: string, password: string): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/signup`, { email, password })
      .pipe(tap((res) => this.user.set(res)));
  }

  login(email: string, password: string): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/login`, { email, password })
      .pipe(tap((res) => this.user.set(res)));
  }

  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/logout`, {}).pipe(finalize(() => this.user.set(null)));
  }

  profile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/me`);
  }
}
