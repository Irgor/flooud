import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { catchError, EMPTY } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  imports: [],
  selector: 'app-profile',
  styleUrl: './profile.scss',
  templateUrl: './profile.html',
})
export class Profile {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.user.asReadonly();
  

  logout() {
    this.authService.logout().subscribe((res) => {
      this.router.navigateByUrl('/login');
    });
  }
}
