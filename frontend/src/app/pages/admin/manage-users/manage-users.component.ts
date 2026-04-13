import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PagedResult } from '../../../models/models';

interface AdminUser {
  id: number;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
}

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 class="fw-bold text-dark m-0">Identity & Access</h4>
          <p class="text-muted small mb-0">Manage system users, roles and security permissions</p>
        </div>
        <div class="d-flex gap-3">
          <div class="search-container">
            <i class="bi bi-search search-icon"></i>
            <input type="text" 
                   class="form-control search-input" 
                   placeholder="Search name or email..." 
                   [(ngModel)]="searchTerm" 
                   (input)="onSearch()">
          </div>
          <select class="form-select status-select shadow-sm" [(ngModel)]="roleFilter" (change)="onSearch()">
            <option value="">All Roles</option>
            <option value="Policyholder">Policyholders</option>
            <option value="Admin">Administrators</option>
          </select>
        </div>
      </div>

      <div class="card border-0 shadow-sm overflow-hidden">
        <div *ngIf="loading" class="text-center py-5">
          <div class="spinner-border spinner-border-sm text-primary"></div>
          <div class="mt-2 text-muted small">Synchronizing user data...</div>
        </div>

        <div class="table-responsive" *ngIf="!loading">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th class="ps-4">User Details</th>
                <th>Security Role</th>
                <th>Account Status</th>
                <th>Last Activity</th>
                <th>Joined</th>
                <th class="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of users">
                <td class="ps-4">
                  <div class="d-flex align-items-center gap-3">
                    <div class="avatar bg-primary-lite text-primary fw-bold">
                      {{ u.fullName.charAt(0) }}
                    </div>
                    <div>
                      <div class="fw-bold text-dark">{{ u.fullName }}</div>
                      <div class="text-muted small">{{ u.email }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge rounded-pill" [ngClass]="u.role === 'Admin' ? 'bg-primary text-white' : 'bg-info-lite text-info'">
                    {{ u.role }}
                  </span>
                </td>
                <td>
                  <span class="badge rounded-pill" [ngClass]="u.isActive ? 'badge-approved' : 'badge-rejected'">
                    {{ u.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="text-muted small">{{ (u.lastLogin | date:'mediumDate') || 'No activity' }}</td>
                <td class="text-muted small">{{ u.createdAt | date:'mediumDate' }}</td>
                <td class="text-end pe-4">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-sm btn-outline-primary mb-0 shadow-sm" 
                            (click)="openRoleModal(u)" title="Modify Permissions">
                      <i class="bi bi-shield-lock me-1"></i> Permissions
                    </button>
                    <button class="btn btn-sm btn-outline-danger mb-0 shadow-sm" 
                            (click)="deleteUser(u.userId)" [disabled]="u.role === 'Admin'" title="Deactivate Account">
                      <i class="bi bi-person-x me-1"></i> Deactivate
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="users.length === 0">
                <td colspan="6" class="text-center py-5 text-muted">No users found matching your filters.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="card-footer bg-transparent border-top-0 py-3 d-flex align-items-center justify-content-between px-4" *ngIf="totalCount > pageSize">
          <div class="small text-muted">Showing <strong>{{ (page - 1) * pageSize + 1 }}</strong>–<strong>{{ min(page * pageSize, totalCount) }}</strong> of <strong>{{ totalCount }}</strong> users</div>
          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="page === 1">
                <button class="page-link" (click)="changePage(page - 1)"><i class="bi bi-chevron-left"></i></button>
              </li>
              <li class="page-item active"><span class="page-link">{{ page }}</span></li>
              <li class="page-item" [class.disabled]="page >= totalPages">
                <button class="page-link" (click)="changePage(page + 1)"><i class="bi bi-chevron-right"></i></button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <!-- Change Role Modal -->
      <div class="modal-glass fade-in" *ngIf="showRoleModal && selectedUser" (click)="showRoleModal = false">
        <div class="modal-glass-content" (click)="$event.stopPropagation()" style="max-width: 400px;">
            <div class="modal-header border-0 pb-0 px-4 pt-4">
              <h5 class="modal-title fw-bold">Modify Permissions</h5>
              <button class="btn-close" (click)="showRoleModal = false"></button>
            </div>
            <div class="modal-body py-4 px-4">
              <div class="d-flex align-items-center gap-3 mb-4">
                <div class="user-avatar" style="width:48px;height:48px;font-size:1rem;">
                  {{ selectedUser.fullName.charAt(0) }}
                </div>
                <div>
                  <div class="fw-bold">{{ selectedUser.fullName }}</div>
                  <div class="text-muted x-small">Current: {{ selectedUser.role }}</div>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label text-muted small fw-bold text-uppercase ls-wide">Assign New Security Role</label>
                <select class="form-select premium-select shadow-sm" [(ngModel)]="newRole">
                  <option value="Policyholder">Policyholder (Basic)</option>
                  <option value="Admin">Administrator (Root)</option>
                </select>
              </div>
            </div>
            <div class="modal-footer border-0 pt-0 pb-4 gap-2 px-4">
              <button class="btn btn-light rounded-pill px-4" (click)="showRoleModal = false">Cancel</button>
              <button class="btn btn-primary rounded-pill px-4 shadow-sm fw-bold" (click)="saveRole()" [disabled]="saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-2"></span>
                Apply Changes
              </button>
            </div>
        </div>
      </div>
    </div>
  `
})
export class ManageUsersComponent implements OnInit {
  private http = inject(HttpClient);

  users: AdminUser[] = [];
  searchTerm = '';
  roleFilter = '';
  page = 1;
  pageSize = 10;
  totalCount = 0;
  loading = true;

  showRoleModal = false;
  selectedUser: AdminUser | null = null;
  newRole = 'Policyholder';
  saving = false;

  ngOnInit(): void { this.loadUsers(); }

  loadUsers(): void {
    this.loading = true;
    let url = `/api/admin/users?page=${this.page}&pageSize=${this.pageSize}`;
    if (this.searchTerm) url += `&searchTerm=${encodeURIComponent(this.searchTerm)}`;
    if (this.roleFilter) url += `&role=${this.roleFilter}`;
    this.http.get<PagedResult<AdminUser>>(url).subscribe({
      next: (res) => { this.users = res.items; this.totalCount = res.totalCount; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openRoleModal(user: AdminUser): void {
    this.selectedUser = user;
    this.newRole = user.role === 'Admin' ? 'Policyholder' : 'Admin';
    this.showRoleModal = true;
  }

  saveRole(): void {
    if (!this.selectedUser) return;
    this.saving = true;
    this.http.put(`/api/auth/users/${this.selectedUser.userId}/roles`, { roleName: this.newRole }).subscribe({
      next: () => { this.showRoleModal = false; this.saving = false; this.loadUsers(); },
      error: (err) => { alert(err.error?.errorMessage ?? 'Failed to change role'); this.saving = false; }
    });
  }

  deleteUser(userId: string): void {
    if (!confirm('Deactivate this user?')) return;
    this.http.delete(`/api/admin/users/${userId}`).subscribe({
      next: () => this.loadUsers(),
      error: (err) => alert('Failed: ' + (err.error?.errorMessage ?? 'Unknown error'))
    });
  }

  onSearch(): void { this.page = 1; this.loadUsers(); }
  changePage(p: number): void { this.page = p; this.loadUsers(); }
  get totalPages(): number { return Math.ceil(this.totalCount / this.pageSize); }
  min(a: number, b: number): number { return Math.min(a, b); }
}
