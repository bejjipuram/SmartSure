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
      <div class="ambient-background"></div>
      
      <!-- Floating Background Elements -->
      <div class="floating-object lg" style="top: 15%; right: -5%; opacity: 0.1;"></div>
      <div class="floating-object md delayed" style="bottom: 15%; left: -5%; opacity: 0.1;"></div>

      <div class="auth-card mx-3 slide-up" style="max-width:440px;">
        <div class="text-center mb-4">
          <div class="mx-auto mb-3 d-flex align-items-center justify-content-center glow-primary"
               style="width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#3b82f6,#2dd4bf);">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h2 class="fw-bold mb-1 text-white" style="font-size:1.75rem; letter-spacing: -0.02em;">Verify Identity</h2>
          <p class="text-white-50 small fw-medium">Input the security code dispatched to your email</p>
        </div>

        <form (ngSubmit)="verify()" #f="ngForm" *ngIf="status === 'form'">
          <div class="mb-4">
            <label class="form-label text-white-50 x-small fw-bold text-uppercase ls-wide">Designated Email</label>
            <div class="input-group">
                <span class="input-group-text bg-transparent border-end-0 text-white-50"><i class="bi bi-envelope"></i></span>
                <input type="email" class="form-control border-start-0 ps-0 text-white" [(ngModel)]="email" name="email" required [readonly]="!!emailFromQuery" placeholder="vector@smartsure.io">
            </div>
          </div>
          <div class="mb-4 text-start">
            <label class="form-label text-white-50 x-small fw-bold text-uppercase ls-wide">Verification OTP</label>
            <div class="input-group">
                <span class="input-group-text bg-transparent border-end-0 text-white-50"><i class="bi bi-key"></i></span>
                <input type="text" class="form-control border-start-0 ps-0 text-white fw-bold ls-wide" [(ngModel)]="otp" name="otp" required maxlength="6" placeholder="Enter 6-digit Code">
            </div>
          </div>
          <button type="submit" class="btn btn-premium btn-premium-primary w-100 py-3 shadow-lg mb-3" [disabled]="loading">
            <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ loading ? 'Authenticating...' : 'Validate OTP' }}
          </button>
          
          <div class="text-center">
             <a routerLink="/login" class="btn btn-premium btn-premium-outline w-100 py-2 transition x-small fw-bold">
                <i class="bi bi-arrow-left me-2"></i>Abort and Return
             </a>
          </div>
        </form>

        <div *ngIf="status === 'success'" class="py-3 text-center">
          <div class="mx-auto mb-4 d-flex align-items-center justify-content-center glow-success"
               style="width:80px;height:80px;border-radius:50%;background:rgba(45, 212, 191, 0.1); border: 2px solid #2dd4bf;">
              <i class="bi bi-check-lg text-success fs-1"></i>
          </div>
          <h4 class="fw-bold text-white mb-2">Email Validated</h4>
          <p class="text-white-50 small mb-4">Your email is now operational.</p>
          <a routerLink="/login" class="btn btn-premium btn-premium-primary px-5 py-3 rounded-pill shadow">Login</a>
        </div>

        <div *ngIf="status === 'error'" class="py-3 text-center">
          <div class="mx-auto mb-4 d-flex align-items-center justify-content-center glow-error"
               style="width:80px;height:80px;border-radius:50%;background:rgba(239, 68, 68, 0.1); border: 2px solid #ef4444;">
              <i class="bi bi-shield-slash text-danger fs-1"></i>
          </div>
          <h4 class="fw-bold text-white mb-2">Validation Failure</h4>
          <p class="text-white-50 small mb-4">{{ errorMessage }}</p>
          <div class="d-flex flex-column gap-2">
            <button (click)="status = 'form'" class="btn btn-premium btn-premium-primary py-3 rounded-pill shadow">Retry OTP Verification</button>
            <a routerLink="/login" class="btn btn-premium btn-premium-outline py-2 rounded-pill transition small fw-bold">Return to Login</a>
          </div>
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
        const password = sessionStorage.getItem('pending_reg_password') || '';
        if (password) {
          this.auth.login(this.email, password).subscribe({
            next: () => {
              sessionStorage.removeItem('pending_reg_password');
              this.status = 'success';
              this.loading = false;
              // Brief delay to show success icon before auto-dashboard
              setTimeout(() => this.router.navigate(['/dashboard']), 800);
            },
            error: () => {
              this.status = 'success';
              this.loading = false;
              sessionStorage.removeItem('pending_reg_password');
            }
          });
        } else {
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
