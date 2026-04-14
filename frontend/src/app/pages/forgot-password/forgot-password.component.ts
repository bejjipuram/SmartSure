import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

type Step = 'email' | 'otp' | 'reset' | 'done';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  template: `
    <div class="auth-bg">
      <div class="ambient-background"></div>
      
      <!-- Floating Background Elements -->
      <div class="floating-object lg delayed" style="top: 10%; right: -10%; opacity: 0.1;"></div>
      <div class="floating-object md" style="bottom: 15%; left: -5%; opacity: 0.1;"></div>

      <div class="auth-card mx-3 slide-up" style="max-width:440px;">
        <div class="text-center mb-4">
          <div class="mx-auto mb-3 d-flex align-items-center justify-content-center glow-primary"
               style="width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#3b82f6,#2dd4bf);">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h2 class="fw-bold mb-1 text-white" style="font-size:1.75rem; letter-spacing: -0.02em;">Account Recovery</h2>
          <p class="text-white-50 small fw-medium">
            <ng-container [ngSwitch]="step">
              <span *ngSwitchCase="'email'">Initiate recovery protocol via email</span>
              <span *ngSwitchCase="'otp'">Validate dispatched security code</span>
              <span *ngSwitchCase="'reset'">Configure new security credentials</span>
            </ng-container>
          </p>
        </div>

        <!-- Done -->
        <div *ngIf="step === 'done'" class="text-center py-3">
          <div class="mx-auto mb-4 d-flex align-items-center justify-content-center glow-success"
               style="width:80px;height:80px;border-radius:50%;background:rgba(45, 212, 191, 0.1); border: 2px solid #2dd4bf;">
              <i class="bi bi-check-lg text-success fs-1"></i>
          </div>
          <h4 class="fw-bold text-white mb-2">Protocol Complete</h4>
          <p class="text-white-50 small mb-4">Credentials have been synchronized. Security layer updated.</p>
          <a routerLink="/login" class="btn btn-premium btn-premium-primary px-5 py-3 rounded-pill shadow">Return to Portal</a>
        </div>

        <ng-container *ngIf="step !== 'done'">
          <div *ngIf="error" class="alert glass-morphism border-danger py-2 px-3 mb-4 text-danger small">
            <i class="bi bi-exclamation-circle me-2"></i>{{ error }}
          </div>

          <!-- Step 1: Email -->
          <form *ngIf="step === 'email'" (ngSubmit)="sendOtp()">
            <div class="mb-4">
              <label class="form-label text-white-50 x-small fw-bold text-uppercase ls-wide">Personnel Email</label>
              <div class="input-group">
                <span class="input-group-text bg-transparent border-end-0 text-white-50"><i class="bi bi-envelope"></i></span>
                <input type="email" class="form-control border-start-0 ps-0 text-white" [(ngModel)]="email" name="email" required placeholder="you@smartsure.io">
              </div>
            </div>
            <button type="submit" class="btn btn-premium btn-premium-primary w-100 py-3 shadow-lg mb-3" [disabled]="loading">
              <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
              {{ loading ? 'Transmitting Code...' : 'Request Security Code' }}
            </button>
            <div class="text-center">
              <a routerLink="/login" class="btn btn-premium btn-premium-outline w-100 py-2 transition x-small fw-bold">Abort Recovery</a>
            </div>
          </form>

          <!-- Step 2: OTP -->
          <form *ngIf="step === 'otp'" (ngSubmit)="verifyOtp()">
            <div class="mb-4">
              <label class="form-label text-white-50 x-small fw-bold text-uppercase ls-wide">Verification OTP</label>
              <div class="input-group">
                <span class="input-group-text bg-transparent border-end-0 text-white-50"><i class="bi bi-key"></i></span>
                <input type="text" class="form-control border-start-0 ps-0 text-white fw-bold ls-wide" [(ngModel)]="otpCode" name="otpCode" required
                       placeholder="Enter 6-digit OTP" maxlength="6" style="font-size:1.2rem;">
              </div>
              <div class="form-text text-white-50 x-small mt-2">Targeted Vector: <strong class="text-white">{{ email }}</strong></div>
            </div>
            <button type="submit" class="btn btn-premium btn-premium-primary w-100 py-3 shadow-lg mb-3" [disabled]="loading">
              <span *ngif="loading" class="spinner-border spinner-border-sm me-2"></span>
              {{ loading ? 'Validating...' : 'Authorize Code' }}
            </button>
            <div class="text-center">
              <button type="button" class="btn btn-premium btn-premium-outline w-100 py-2 transition x-small fw-bold" (click)="step = 'email'">
                &larr; Re-specify Vector
              </button>
            </div>
          </form>

          <!-- Step 3: New Password -->
          <form *ngIf="step === 'reset'" (ngSubmit)="resetPassword()">
            <div class="mb-4">
              <label class="form-label text-white-50 x-small fw-bold text-uppercase ls-wide">New Security Key</label>
              <div class="input-group">
                <span class="input-group-text bg-transparent border-end-0 text-white-50"><i class="bi bi-lock"></i></span>
                <input type="password" class="form-control border-start-0 ps-0 text-white" [(ngModel)]="newPassword" name="newPassword"
                       required minlength="6" placeholder="Configure new key">
              </div>
            </div>
            <div class="mb-4">
              <label class="form-label text-white-50 x-small fw-bold text-uppercase ls-wide">Confirm Security Key</label>
              <div class="input-group">
                <span class="input-group-text bg-transparent border-end-0 text-white-50"><i class="bi bi-shield-lock"></i></span>
                <input type="password" class="form-control border-start-0 ps-0 text-white" [(ngModel)]="confirmPassword" name="confirmPassword"
                       required placeholder="Re-initialize key">
              </div>
            </div>
            <button type="submit" class="btn btn-premium btn-premium-primary w-100 py-3 shadow-lg" [disabled]="loading">
              <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
              {{ loading ? 'Synchronizing...' : 'Finalize Credentials' }}
            </button>
          </form>
        </ng-container>

        <p *ngIf="step === 'email'" class="text-center small mt-5 mb-0 text-white-50">
          Identified your key?
          <a routerLink="/login" class="text-primary fw-bold text-decoration-none ms-1">Authorize Session</a>
        </p>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  step: Step = 'email';
  email = '';
  otpCode = '';
  newPassword = '';
  confirmPassword = '';
  resetToken = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService) {}

  sendOtp(): void {
    this.error = '';
    this.loading = true;
    this.auth.forgotPassword(this.email).subscribe({
      next: () => { this.step = 'otp'; this.loading = false; },
      error: (err) => { this.error = err?.error?.message ?? 'Failed to send OTP.'; this.loading = false; }
    });
  }

  verifyOtp(): void {
    this.error = '';
    this.loading = true;
    this.auth.verifyOtp(this.email, this.otpCode).subscribe({
      next: (res) => { this.resetToken = res.resetToken; this.step = 'reset'; this.loading = false; },
      error: (err) => { this.error = err?.error?.message ?? 'Invalid or expired OTP.'; this.loading = false; }
    });
  }

  resetPassword(): void {
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }
    this.error = '';
    this.loading = true;
    this.auth.resetPassword(this.email, this.newPassword, this.resetToken).subscribe({
      next: () => { this.step = 'done'; this.loading = false; },
      error: (err) => { this.error = err?.error?.message ?? 'Failed to reset password.'; this.loading = false; }
    });
  }
}
