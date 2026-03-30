import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="row g-4">

      <!-- Personal Info -->
      <div class="col-lg-6">
        <div class="profile-section">
          <h5><i class="bi bi-person-circle me-2 text-primary"></i>Personal Information</h5>

          <div *ngIf="profileSuccess" class="alert alert-success small py-2 mb-3">
            <i class="bi bi-check-circle me-2"></i>{{ profileSuccess }}
          </div>
          <div *ngIf="profileError" class="alert alert-danger small py-2 mb-3">
            <i class="bi bi-exclamation-circle me-2"></i>{{ profileError }}
          </div>

          <form (ngSubmit)="saveProfile()" #profileForm="ngForm">
            <div class="mb-3">
              <label class="form-label small fw-medium">Full Name</label>
              <input type="text" class="form-control" [(ngModel)]="fullName" name="fullName" required>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-medium">Email Address</label>
              <input type="email" class="form-control" [(ngModel)]="email" name="email" required>
            </div>
            <div class="mb-4">
              <label class="form-label small fw-medium">Phone Number</label>
              <input type="tel" class="form-control" [(ngModel)]="phone" name="phone" required>
            </div>
            <button type="submit" class="btn btn-gradient px-4" [disabled]="profileLoading">
              <span *ngIf="profileLoading" class="spinner-border spinner-border-sm me-2"></span>
              {{ profileLoading ? 'Saving...' : 'Save Changes' }}
            </button>
          </form>
        </div>
      </div>

      <!-- Change Password -->
      <div class="col-lg-6">
        <div class="profile-section">
          <h5><i class="bi bi-lock me-2 text-primary"></i>Change Password</h5>

          <div *ngIf="passSuccess" class="alert alert-success small py-2 mb-3">
            <i class="bi bi-check-circle me-2"></i>{{ passSuccess }}
          </div>
          <div *ngIf="passError" class="alert alert-danger small py-2 mb-3">
            <i class="bi bi-exclamation-circle me-2"></i>{{ passError }}
          </div>

          <form (ngSubmit)="changePassword()" #passForm="ngForm">
            <div class="mb-3">
              <label class="form-label small fw-medium">Current Password</label>
              <input type="password" class="form-control" [(ngModel)]="currentPassword" name="currentPassword" required placeholder="••••••••">
            </div>
            <div class="mb-3">
              <label class="form-label small fw-medium">New Password</label>
              <input type="password" class="form-control" [(ngModel)]="newPassword" name="newPassword" required placeholder="••••••••">
            </div>
            <div class="mb-4">
              <label class="form-label small fw-medium">Confirm New Password</label>
              <input type="password" class="form-control" [(ngModel)]="confirmNewPassword" name="confirmNewPassword" required placeholder="••••••••">
            </div>
            <button type="submit" class="btn btn-gradient px-4" [disabled]="passLoading">
              <span *ngIf="passLoading" class="spinner-border spinner-border-sm me-2"></span>
              {{ passLoading ? 'Updating...' : 'Update Password' }}
            </button>
          </form>
        </div>

        <!-- Account info card -->
        <div class="profile-section mt-4" style="background:linear-gradient(135deg,#eff6ff,#f0fdf4);">
          <div class="d-flex align-items-center gap-3">
            <div class="user-avatar" style="width:52px;height:52px;font-size:1.1rem;">
              {{ initials }}
            </div>
            <div>
              <div class="fw-bold">{{ fullName }}</div>
              <div class="text-muted small">{{ email }}</div>
              <div class="text-muted small mt-1"><i class="bi bi-telephone me-1"></i>{{ phone }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  fullName = '';
  email = '';
  phone = '';

  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';

  profileLoading = false;
  profileSuccess = '';
  profileError = '';

  passLoading = false;
  passSuccess = '';
  passError = '';

  get initials(): string {
    if (!this.fullName) return '';
    return this.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    if (user) {
      this.fullName = user.fullName;
      this.email = user.email;
      this.phone = user.phone || '';
    }
    this.auth.getProfile().subscribe({
      next: (u: User) => {
        this.fullName = u.fullName;
        this.email = u.email;
        this.phone = u.phone || '';
      },
      error: () => {}
    });
  }

  saveProfile(): void {
    this.profileError = '';
    this.profileSuccess = '';
    this.profileLoading = true;
    this.auth.updateProfile({ fullName: this.fullName, email: this.email, phone: this.phone }).subscribe({
      next: (u: User) => {
        // Here we just refresh the local storage with the new profile
        this.auth.storeAuth({ 
            accessToken: this.auth.getToken()!, 
            email: u.email,
            fullName: u.fullName,
            roles: u.roles || []
        });
        this.profileSuccess = 'Profile updated successfully.';
        this.profileLoading = false;
      },
      error: (err) => {
        this.profileError = err?.error?.errorMessage ?? 'Failed to update profile.';
        this.profileLoading = false;
      }
    });
  }

  changePassword(): void {
    this.passError = '';
    this.passSuccess = '';
    if (this.newPassword !== this.confirmNewPassword) {
      this.passError = 'New passwords do not match.';
      return;
    }
    this.passLoading = true;
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.passSuccess = 'Password updated successfully.';
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
        this.passLoading = false;
      },
      error: (err) => {
        this.passError = err?.error?.errorMessage ?? 'Failed to update password.';
        this.passLoading = false;
      }
    });
  }
}
