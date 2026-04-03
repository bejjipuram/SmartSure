import { Component } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="auth-bg">
      <div class="auth-card mx-3 text-center" style="max-width:400px;">
        <div class="mx-auto mb-3 d-flex align-items-center justify-content-center"
             style="width:60px;height:60px;border-radius:16px;background:linear-gradient(135deg,#1a56db,#0d9488);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>

        <h5 class="fw-bold mb-2">Verify your email</h5>
        <p class="text-muted small mb-4">Enter the OTP sent to your email address to activate your account.</p>

        <form (ngSubmit)="verify()" #f="ngForm" *ngIf="status === 'form'">
          <div class="mb-3 text-start">
            <label class="form-label small fw-medium">Email address</label>
            <input type="email" class="form-control" [(ngModel)]="email" name="email" required [readonly]="!!emailFromQuery">
          </div>
          <div class="mb-3 text-start">
            <label class="form-label small fw-medium">OTP Code</label>
            <input type="text" class="form-control" [(ngModel)]="otp" name="otp" required maxlength="6" placeholder="Enter 6-digit OTP">
          </div>
          <button type="submit" class="btn btn-gradient w-100" [disabled]="loading">
            <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ loading ? 'Verifying...' : 'Verify Email' }}
          </button>
        </form>

        <div *ngIf="status === 'success'" class="py-3">
          <i class="bi bi-check-circle-fill text-success" style="font-size:3rem;"></i>
          <h5 class="mt-3 fw-bold">Email verified!</h5>
          <p class="text-muted small">Your account is now active. You can sign in.</p>
          <a routerLink="/login" class="btn btn-gradient mt-2 px-4">Sign in</a>
        </div>

        <div *ngIf="status === 'error'" class="py-3">
          <i class="bi bi-x-circle-fill text-danger" style="font-size:3rem;"></i>
          <h5 class="mt-3 fw-bold">Verification failed</h5>
          <p class="text-muted small">{{ errorMessage }}</p>
          <a routerLink="/login" class="btn btn-gradient mt-2 px-4">Back to Sign in</a>
        </div>
      </div>
    </div>
  `
})
export class VerifyEmailComponent {
  email = '';
  otp = '';
  loading = false;
  status: 'form' | 'success' | 'error' = 'form';
  errorMessage = '';
  emailFromQuery = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private auth: AuthService,
    private router: Router
  ) {
    const emailParam = this.route.snapshot.queryParamMap.get('email');
    if (emailParam) {
      this.email = emailParam;
      this.emailFromQuery = true;
    }
  }

  verify(): void {
    this.loading = true;
    this.errorMessage = '';
    this.http.post('/api/auth/verify-email-otp', { email: this.email, otpCode: this.otp }).subscribe({
      next: () => {
        // Retrieve password from sessionStorage for auto-login
        const password = sessionStorage.getItem('pending_reg_password') || '';
        if (password) {
          this.auth.login(this.email, password).subscribe({
            next: () => {
              sessionStorage.removeItem('pending_reg_password');
              this.router.navigate(['/dashboard']);
            },
            error: () => {
              this.status = 'success';
              this.loading = false;
              sessionStorage.removeItem('pending_reg_password');
            }
          });
        } else {
          // fallback: show success and let user sign in manually
          this.status = 'success';
          this.loading = false;
        }
      },
      error: (err) => {
        this.status = 'error';
        this.errorMessage = err?.error?.errorMessage ?? 'Invalid or expired OTP.';
        this.loading = false;
      }
    });
  }
}
