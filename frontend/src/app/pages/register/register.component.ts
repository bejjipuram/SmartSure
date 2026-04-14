import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { COUNTRY_CODES } from '../../models/country-codes';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  template: `
    <div class="auth-bg" style="padding: 4rem 0;">
      <div class="ambient-background"></div>

      <!-- Floating Background Elements -->
      <div class="floating-object lg delayed" style="top: -5%; right: 10%; opacity: 0.1;"></div>
      <div class="floating-object md" style="bottom: 5%; left: 5%; opacity: 0.1;"></div>

      <div class="auth-card mx-3 slide-up" style="max-width:500px;">
        <div class="text-center mb-4">
          <div class="mx-auto mb-3 d-flex align-items-center justify-content-center glow-primary"
               style="width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#3b82f6,#2dd4bf);">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h2 class="fw-bold mb-1 text-white" style="font-size:1.75rem; letter-spacing: -0.02em;">Create account</h2>
          <p class="text-white-50 small fw-medium">Initialize your status in the SmartSure network</p>
        </div>

        <div *ngIf="error" class="alert glass-morphism border-danger py-2 px-3 mb-4 text-danger small">
          <i class="bi bi-exclamation-circle me-2"></i>{{ error }}
        </div>

        <form (ngSubmit)="onSubmit()" #f="ngForm" class="auth-form">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label text-white-50 x-small fw-bold text-uppercase ls-wide">Full Legal Name</label>
              <div class="input-group">
                <span class="input-group-text bg-transparent border-end-0 text-white-50"><i class="bi bi-person"></i></span>
                <input type="text" class="form-control border-start-0 ps-0 text-white" [(ngModel)]="fullName" name="fullName" required placeholder="John Doe">
              </div>
            </div>
            
            <div class="col-12">
              <label class="form-label text-white-50 x-small fw-bold text-uppercase ls-wide">Personnel Email</label>
              <div class="input-group">
                <span class="input-group-text bg-transparent border-end-0 text-white-50"><i class="bi bi-envelope"></i></span>
                <input type="email" class="form-control border-start-0 ps-0 text-white" [(ngModel)]="email" name="email" required placeholder="you@example.com" autocomplete="email">
              </div>
              <div *ngIf="email && !validateEmail(email)" class="text-danger x-small mt-1 fw-bold">Invalid Email format</div>
            </div>

            <div class="col-12">
              <label class="form-label text-white-50 x-small fw-bold text-uppercase ls-wide">Mobile Number</label>
              <div class="input-group">
                <span class="input-group-text bg-transparent border-end-0 text-white-50"><i class="bi bi-phone"></i></span>
                <input type="tel" class="form-control border-start-0 ps-0 text-white" [(ngModel)]="phone" name="phone" required pattern="[6-9]{1}[0-9]{9}" placeholder="9876543210">
              </div>
              <div *ngIf="phone && !validatePhone(phone)" class="text-danger x-small mt-1 fw-bold">Use 10-digit Indian standard</div>
            </div>

            <div class="col-md-6">
              <label class="form-label text-white-50 x-small fw-bold text-uppercase ls-wide">Security Key</label>
              <div class="input-group">
                <input [type]="showPassword ? 'text' : 'password'" class="form-control border-end-0 text-white"
                       [(ngModel)]="password" name="password" required placeholder="••••••••">
                <button type="button" class="btn btn-outline-secondary border-start-0 text-white-50" (click)="showPassword = !showPassword">
                  <i [class]="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
            </div>
            
            <div class="col-md-6">
              <label class="form-label text-white-50 x-small fw-bold text-uppercase ls-wide">Confirm Key</label>
              <input type="password" class="form-control text-white" [(ngModel)]="confirmPassword" name="confirmPassword" required placeholder="••••••••">
            </div>
          </div>

          <div *ngIf="password && !isStrongPassword(password)" class="text-info x-small mt-3 p-2 glass-morphism rounded-3">
            <i class="bi bi-info-circle me-1"></i> Ensure key complexity: 8+ chars, Case mixed, Symbol included.
          </div>

          <button type="submit" class="btn btn-premium btn-premium-primary w-100 py-3 mt-4 shadow-lg" [disabled]="loading">
            <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ loading ? 'Provisioning...' : 'Initialize Account' }}
          </button>
        </form>

        <div class="d-flex align-items-center my-4 opacity-50">
          <hr class="flex-grow-1 border-white"><span class="px-3 text-white x-small fw-bold">OR</span><hr class="flex-grow-1 border-white">
        </div>

        <a href="http://localhost:5001/api/auth/google" class="btn btn-premium btn-premium-outline w-100 py-2 d-flex align-items-center justify-content-center gap-3 transition">
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          <span class="small fw-bold">Join with Google</span>
        </a>

        <p class="text-center small mt-5 mb-0 text-white-50">
          Already a member of the SmartSure network?
          <a routerLink="/login" class="text-primary fw-bold text-decoration-none ms-1">Authorize Session</a>
        </p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  // countryCode = '+1'; // Removed country code initialization
  phone = '';
  showPassword = false;
  loading = false;
  error = '';
  countryCodes = COUNTRY_CODES;

  constructor(private auth: AuthService, private router: Router) {}

  validatePhone(phone: string): boolean {
    // Indian mobile: 10 digits, starts with 6-9
    return /^[6-9]\d{9}$/.test(phone);
  }

  validateEmail(email: string): boolean {
    // Simple email regex
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  }

  isStrongPassword(password: string): boolean {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(password);
  }

  onSubmit(): void {
    this.error = '';
    if (!this.validateEmail(this.email)) {
      this.error = 'Please enter a valid email address.';
      return;
    }
    if (!this.isStrongPassword(this.password)) {
      this.error = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }
    if (!this.validatePhone(this.phone)) {
      this.error = 'Please enter a valid Indian mobile number (10 digits, starts with 6-9).';
      return;
    }
    this.loading = true;
    // Store password in sessionStorage for auto-login after verification
    sessionStorage.setItem('pending_reg_password', this.password);
    this.auth.register({
      fullName: this.fullName,
      email: this.email,
      password: this.password,
      phone: this.phone
    }).subscribe({
      next: () => {
        this.router.navigate(['/verify-email'], { queryParams: { email: this.email } });
      },
      error: (err) => {
        this.error = err?.error?.errorMessage ?? err?.error?.message ?? 'Registration failed.';
        this.loading = false;
        sessionStorage.removeItem('pending_reg_password');
      }
    });
  }
}
