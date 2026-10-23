import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { AuthService, AuthUserData } from '../../core/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  imports: [FormRoot, FormField],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly loginModel = signal<AuthUserData>({ email: '', password: '' });

  readonly loginForm = form(
    this.loginModel,
    (f) => {
      required(f.email);
      email(f.email);
      required(f.password);
    },
    {
      submission: {
        action: async (formState) => {
          const { email, password } = formState().value();
          this.authService.login(email, password).subscribe((res) => {
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] ?? '/profile';
            this.router.navigateByUrl(returnUrl);
          });
        },
      },
    },
  );
}
