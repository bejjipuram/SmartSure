import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, ChartType } from 'chart.js';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { LocaleService } from '../../services/locale.service';
import { DashboardData, Policy, Claim, AdminDashboardData, AuditLog } from '../../models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, BaseChartDirective],
  template: `
    <div *ngIf="!loading" class="fade-in">
      
      <!-- ADMIN VIEW -->
      <div *ngIf="isAdmin && adminData">
        <div class="d-flex align-items-center justify-content-between mb-4">
          <h4 class="fw-bold text-dark m-0">System Overview</h4>
          <span class="badge bg-primary-lite rounded-pill">Admin Dashboard</span>
        </div>
        
        <!-- Row 1: Key metrics -->
        <div class="row g-4 mb-4">
          <div class="col-sm-4">
            <div class="card border-0 shadow-sm p-4">
              <div class="d-flex align-items-center gap-3">
                <div class="stat-icon bg-primary-lite text-primary"><i class="bi bi-people"></i></div>
                <div>
                  <div class="text-muted small fw-bold text-uppercase ls-wide">Active Users</div>
                  <div class="h3 fw-bold m-0">{{ adminData.activeUsers }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-sm-4">
            <div class="card border-0 shadow-sm p-4">
              <div class="d-flex align-items-center gap-3">
                <div class="stat-icon bg-success-lite text-success"><i class="bi bi-cash-stack"></i></div>
                <div>
                  <div class="text-muted small fw-bold text-uppercase ls-wide">Total Revenue</div>
                  <div class="h3 fw-bold m-0">₹{{ adminData.totalRevenue | number:'1.2-2' }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-sm-4">
            <div class="card border-0 shadow-sm p-4">
              <div class="d-flex align-items-center gap-3">
                <div class="stat-icon bg-warning-lite text-warning"><i class="bi bi-hourglass-split"></i></div>
                <div>
                  <div class="text-muted small fw-bold text-uppercase ls-wide">Pending Claims</div>
                  <div class="h3 fw-bold m-0">{{ adminData.pendingClaims }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4">
           <div class="col-xl-8">
              <div class="card border-0 shadow-sm">
                <div class="card-header border-bottom-0 pt-4 px-4 bg-transparent d-flex justify-content-between align-items-center">
                  <h6 class="mb-0 fw-bold">Recent Audit Activity</h6>
                  <a routerLink="/admin/audit-logs" class="btn btn-sm btn-outline-secondary rounded-pill px-3">View More</a>
                </div>
                <div class="card-body p-0">
                  <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                      <thead>
                        <tr>
                          <th class="ps-4">Timestamp</th>
                          <th>User</th>
                          <th>Action</th>
                          <th>Entity</th>
                          <th class="pe-4">Details</th>
                        </tr>
                      </thead>
                      <tbody class="small">
                        <tr *ngFor="let log of auditLogs">
                          <td class="ps-4 text-muted">{{ log.timestamp | date:'shortTime' }}</td>
                          <td class="fw-semibold">{{ log.userName || 'System' }}</td>
                          <td>
                            <span class="badge rounded-pill" 
                              [ngClass]="{
                                'badge-approved': log.action.includes('Create') || log.action.includes('Approved'),
                                'badge-pending': log.action.includes('Update') || log.action.includes('Modified'),
                                'badge-rejected': log.action.includes('Delete') || log.action.includes('Rejected'),
                                'badge-in-review': !log.action.includes('Create') && !log.action.includes('Update') && !log.action.includes('Delete')
                              }">
                              {{ log.action }}
                            </span>
                          </td>
                          <td>{{ log.entityName }}</td>
                          <td class="pe-4 text-truncate" style="max-width:180px;">{{ log.details }}</td>
                        </tr>
                        <tr *ngIf="auditLogs.length === 0">
                          <td colspan="5" class="text-center text-muted py-5 italic">No recent system activity.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
           </div>
           <div class="col-xl-4">
              <div class="card border-0 shadow-sm h-100">
                <div class="card-header border-bottom-0 pt-4 px-4 bg-transparent">
                  <h6 class="fw-bold mb-0">Quick Management</h6>
                </div>
                <div class="card-body px-4 pb-4 pt-2 d-grid gap-2">
                  <a routerLink="/admin/claims" class="btn btn-warning bg-warning-lite border-0 text-warning d-flex align-items-center justify-content-between px-3 py-3">
                    <span class="fw-bold"><i class="bi bi-shield-exclamation me-2"></i>Pending Claims</span>
                    <span class="badge bg-warning text-white rounded-pill px-2">{{ adminData.pendingClaims }}</span>
                  </a>
                  <a routerLink="/admin/users" class="btn btn-primary bg-primary-lite border-0 text-primary d-flex align-items-center px-3 py-3">
                    <span class="fw-bold"><i class="bi bi-people me-2"></i>User Management</span>
                  </a>
                  <a routerLink="/admin/policies" class="btn btn-info bg-primary-lite border-0 text-info d-flex align-items-center px-3 py-3">
                    <span class="fw-bold"><i class="bi bi-file-earmark-text me-2"></i>Policy Archives</span>
                  </a>
                  <a routerLink="/admin/insurance" class="btn btn-success bg-success-lite border-0 text-success d-flex align-items-center px-3 py-3">
                    <span class="fw-bold"><i class="bi bi-plus-circle me-2"></i>Insurance Products</span>
                  </a>
                </div>
              </div>
           </div>
        </div>
      </div>

      <!-- CUSTOMER VIEW -->
      <div *ngIf="!isAdmin && data">
        <div class="d-flex align-items-center justify-content-between mb-4">
           <h4 class="fw-bold text-dark m-0">My Dashboard</h4>
           <div class="d-flex gap-2">
              <a routerLink="/new-policy" class="btn btn-primary btn-sm rounded-pill px-3">New Policy</a>
              <a routerLink="/claims/initiate" class="btn btn-outline-primary btn-sm rounded-pill px-3">File Claim</a>
           </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-6 col-xl-3">
            <div class="card border-0 shadow-sm p-3">
              <div class="d-flex align-items-center gap-3">
                <div class="stat-icon bg-primary-lite text-primary"><i class="bi bi-shield-check"></i></div>
                <div>
                  <div class="text-muted small fw-bold">Policies</div>
                  <div class="h4 fw-bold m-0">{{ data.activePolicies }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-6 col-xl-3">
            <div class="card border-0 shadow-sm p-3">
              <div class="d-flex align-items-center gap-3">
                <div class="stat-icon bg-success-lite text-success"><i class="bi bi-graph-up-arrow"></i></div>
                <div>
                  <div class="text-muted small fw-bold">Premium</div>
                  <div class="h4 fw-bold m-0">₹{{ data.totalPremium | number:'1.2-2' }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-6 col-xl-3">
            <div class="card border-0 shadow-sm p-3">
              <div class="d-flex align-items-center gap-3">
                <div class="stat-icon bg-warning-lite text-warning"><i class="bi bi-exclamation-circle"></i></div>
                <div>
                  <div class="text-muted small fw-bold">Pending</div>
                  <div class="h4 fw-bold m-0">{{ data.pendingClaims }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-6 col-xl-3">
            <div class="card border-0 shadow-sm p-3">
              <div class="d-flex align-items-center gap-3">
                <div class="stat-icon bg-info text-white"><i class="bi bi-file-earmark-text"></i></div>
                <div>
                  <div class="text-muted small fw-bold">Total Claims</div>
                  <div class="h4 fw-bold m-0">{{ data.totalClaims }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-6">
            <div class="card border-0 shadow-sm p-4">
              <h6 class="fw-bold mb-4">Policies by Type</h6>
              <div style="height:250px;">
                <canvas baseChart [data]="pieChartData" [options]="pieChartOptions" type="pie"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card border-0 shadow-sm p-4">
              <h6 class="fw-bold mb-4">Claim Status Summary</h6>
              <div style="height:250px;">
                <canvas baseChart [data]="barChartData" [options]="barChartOptions" type="bar"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm overflow-hidden">
          <div class="card-header border-bottom-0 p-4 bg-transparent d-flex align-items-center justify-content-between">
            <h6 class="mb-0 fw-bold">Recent Claim Activity</h6>
            <a routerLink="/claims" class="text-primary small fw-bold text-decoration-none">View All Activity</a>
          </div>
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th class="ps-4">Reference</th>
                  <th>Incident Details</th>
                  <th>Status</th>
                  <th class="text-end pe-4">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of data.recentClaims">
                  <td class="ps-4"><code class="fw-bold text-primary">{{ c.claimNumber || 'CLM-' + c.id }}</code></td>
                  <td class="small">{{ c.description }}</td>
                  <td><span class="badge rounded-pill" [ngClass]="claimBadgeClass(c.status)">{{ c.status }}</span></td>
                  <td class="text-end pe-4 fw-bold">₹{{ c.claimAmount | number:'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ls-wide { letter-spacing: 0.05em; }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }
    .text-danger-hover:hover { color: var(--danger) !important; background: rgba(239, 68, 68, 0.05) !important; }
  `]
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  locale = inject(LocaleService);

  data: DashboardData | null = null;
  adminData: AdminDashboardData | null = null;
  auditLogs: AuditLog[] = [];
  loading = true;
  isAdmin = false;

  pieChartData: ChartData<'pie'> = { labels: [], datasets: [] };
  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } }
  };

  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  };

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.isAdmin = user?.roles?.includes('Admin') ?? false;

    if (this.isAdmin) {
      this.loadAdminDashboard();
    } else {
      this.loadCustomerDashboard();
    }
  }

  loadAdminDashboard(): void {
    this.dashboardService.getAdminDashboard().subscribe({
      next: (d) => {
        this.adminData = d;
        this.dashboardService.getAuditLogs(1, 10).subscribe(logs => {
          this.auditLogs = logs.items;
          this.loading = false;
        });
      },
      error: () => { this.loading = false; }
    });
  }

  loadCustomerDashboard(): void {
    this.dashboardService.getDashboard().subscribe({
      next: (data) => {
        this.data = data;
        this.buildCharts(data);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  buildCharts(d: DashboardData): void {
    const pieColors = ['#1a56db', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    this.pieChartData = {
      labels: d.policyByStatus.map(x => x.status),
      datasets: [{ data: d.policyByStatus.map(x => x.count), backgroundColor: pieColors }]
    };

    const statusColors: Record<string, string> = {
      'Pending': '#f59e0b', 'In Review': '#3b82f6',
      'Approved': '#10b981', 'Rejected': '#ef4444'
    };
    this.barChartData = {
      labels: d.claimByStatus.map(x => x.status),
      datasets: [{
        data: d.claimByStatus.map(x => x.count),
        backgroundColor: d.claimByStatus.map(x => statusColors[x.status] ?? '#6366f1'),
        borderRadius: 6
      }]
    };
  }

  claimBadgeClass(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'badge-pending', 'In Review': 'badge-in-review',
      'Approved': 'badge-approved', 'Rejected': 'badge-rejected',
      'Submitted': 'badge-pending'
    };
    return map[status] ?? 'bg-secondary';
  }
}
