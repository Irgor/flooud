import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { AuthService, AuthUserData } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  imports: [FormField, FormRoot],
  selector: 'app-signup',
  styleUrl: './signup.scss',
  templateUrl: './signup.html',
})
export class Signup {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly registerModel = signal<AuthUserData>({ email: '', password: '' });

  readonly registerForm = form(
    this.registerModel,
    (f) => {
      required(f.email);
      email(f.email);
      required(f.password);
    },
    {
      submission: {
        action: async (formState) => {
          const { email, password } = formState().value();
          this.authService.signUp(email, password).subscribe((res) => {
            this.router.navigateByUrl('/profile');
          });
        },
      },
    },
  );
}
