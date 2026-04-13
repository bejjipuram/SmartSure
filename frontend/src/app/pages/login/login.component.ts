import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
// import { LocaleService, COUNTRY_LOCALES } from '../../services/locale.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  template: `
    <div class="auth-bg">
      <div class="ambient-background"></div>
      
      <!-- Floating Background Elements -->
      <div class="floating-object lg" style="top: 10%; left: -5%; opacity: 0.1;"></div>
      <div class="floating-object md delayed" style="bottom: 10%; right: -5%; opacity: 0.1;"></div>

      <div class="auth-card mx-3 slide-up">
        <div class="text-center mb-4">
          <div class="mx-auto mb-3 d-flex align-items-center justify-content-center glow-primary"
               style="width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#3b82f6,#2dd4bf);">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h2 class="fw-bold mb-1 text-white" style="font-size:1.75rem; letter-spacing: -0.02em;">Welcome back</h2>
          <p class="text-white-50 small fw-medium">Authentication required to access infrastructure</p>
        </div>

        <!-- Generic error -->
        <div *ngIf="error && !emailNotVerified" class="alert glass-morphism border-danger py-2 px-3 mb-4 text-danger small" role="alert">
          <i class="bi bi-exclamation-circle me-2"></i>{{ error }}
        </div>

        <!-- Email not verified banner -->
        <div *ngIf="emailNotVerified" class="alert glass-morphism border-warning py-3 px-3 mb-4 text-warning">
          <div class="d-flex align-items-center gap-2 mb-2">
            <i class="bi bi-envelope-exclamation fs-5"></i>
            <span class="fw-bold small">Email Verification Pending</span>
          </div>
          <p class="small text-white-50 mb-3">Please verify your account to proceed with the administrative session.</p>
          <button class="btn btn-sm btn-warning w-100 rounded-pill fw-bold" [disabled]="resendLoading" (click)="resendVerification()">
            <span *ngIf="resendLoading" class="spinner-border spinner-border-sm me-1"></span>
            {{ resendLoading ? 'Sending Protocol...' : 'Resend Verification Code' }}
          </button>
          <div *ngIf="resendSuccess" class="mt-2 text-center x-small text-success fw-bold">
              <i class="bi bi-check-circle me-1"></i>OTP Dispatched Successfully
          </div>
        </div>

        <form (ngSubmit)="onSubmit()" #f="ngForm" class="auth-form">
          <div class="mb-4">
            <label class="form-label text-white-50 x-small fw-bold text-uppercase ls-wide">Personnel Email</label>
            <div class="input-group">
                <span class="input-group-text bg-transparent border-end-0 text-white-50"><i class="bi bi-envelope"></i></span>
                <input type="email" class="form-control border-start-0 ps-0 text-white" [(ngModel)]="email" name="email" required
                       placeholder="you@smartsure.io" autocomplete="email">
            </div>
          </div>
          <div class="mb-4">
            <label class="form-label text-white-50 x-small fw-bold text-uppercase ls-wide">Security Key</label>
            <div class="input-group">
              <span class="input-group-text bg-transparent border-end-0 text-white-50"><i class="bi bi-lock"></i></span>
              <input [type]="showPassword ? 'text' : 'password'" class="form-control border-start-0 border-end-0 ps-0 text-white"
                     [(ngModel)]="password" name="password" required
                     placeholder="••••••••" autocomplete="current-password">
              <button type="button" class="btn btn-outline-secondary border-start-0 text-white-50" (click)="showPassword = !showPassword">
                <i [class]="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
          </div>

          <div class="d-flex justify-content-end mb-4">
            <a routerLink="/forgot-password" class="x-small text-primary fw-bold text-decoration-none ls-wide text-uppercase">
              Recover Access?
            </a>
          </div>
          <button type="submit" class="btn btn-premium btn-premium-primary w-100 py-3 shadow-lg" [disabled]="loading">
            <span *ngIf="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
            {{ loading ? 'Synchronizing...' : 'Authorize Session' }}
          </button>
        </form>

        <div class="d-flex align-items-center my-4 opacity-50">
          <hr class="flex-grow-1 border-white"><span class="px-3 text-white x-small fw-bold">OR PROVIDER</span><hr class="flex-grow-1 border-white">
        </div>

        <a href="http://localhost:5001/api/auth/google" class="btn btn-premium btn-premium-outline w-100 py-2 d-flex align-items-center justify-content-center gap-3 transition">
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          <span class="small fw-bold">Sign in with Google</span>
        </a>

        <p class="text-center small mt-5 mb-0 text-white-50">
          New to the infrastructure?
          <a routerLink="/register" class="text-primary fw-bold text-decoration-none ms-1">Initialize Account</a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  error = '';
  emailNotVerified = false;
  resendLoading = false;
  resendSuccess = false;

  // Country/currency selection removed

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {}





  onSubmit(): void {
    this.error = '';
    this.emailNotVerified = false;
    this.resendSuccess = false;
    this.loading = true;

    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        const msg: string = err?.error?.errorMessage ?? err?.error?.message ?? 'Login failed. Please check your credentials.';
        if (msg.toLowerCase().includes('verify your email')) {
          this.emailNotVerified = true;
        } else {
          this.error = msg;
        }
        this.loading = false;
      }
    });
  }

  resendVerification(): void {
    this.resendLoading = true;
    this.resendSuccess = false;
    this.auth.resendVerification(this.email).subscribe({
      next: () => { this.resendSuccess = true; this.resendLoading = false; },
      error: () => { this.resendLoading = false; }
    });
  }
}
