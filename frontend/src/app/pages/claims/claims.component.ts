import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClaimService } from '../../services/claim.service';
import { PolicyService } from '../../services/policy.service';
import { LocaleService } from '../../services/locale.service';
import { Claim, Policy } from '../../models/models';

@Component({
  selector: 'app-claims',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 class="fw-bold text-dark m-0">Claims & Incident Reports</h4>
          <p class="text-muted small mb-0">Track the status of your active and historical resolution requests</p>
        </div>
        <div class="d-flex gap-2 p-1 bg-light-soft rounded-pill border shadow-sm">
          <button *ngFor="let tab of tabs"
                  class="btn btn-sm rounded-pill px-3 py-1 border-0 fw-bold transition"
                  [ngClass]="activeTab === tab ? 'btn-primary shadow-sm' : 'btn-ghost text-muted'"
                  (click)="activeTab = tab; applyFilter()">
            {{ tab }}
            <span *ngIf="countByStatus(tab) > 0" 
                  class="badge ms-1" 
                  [ngClass]="activeTab === tab ? 'bg-white text-primary' : 'bg-primary-lite text-primary'">
              {{ countByStatus(tab) }}
            </span>
          </button>
        </div>
      </div>

      <div *ngIf="loading" class="text-center py-5">
        <div class="spinner-border spinner-border-sm text-primary"></div>
        <div class="mt-2 text-muted x-small fw-bold text-uppercase ls-wide">Querying Claims Registry...</div>
      </div>

      <div *ngIf="error && claims.length === 0" class="alert badge-pending border-0 shadow-sm py-3 mb-4">
        <i class="bi bi-info-circle-fill me-2"></i>{{ error }}
      </div>

      <div *ngIf="!loading" class="card border-0 shadow-sm rounded-4 overflow-hidden slide-up">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="bg-light">
              <tr>
                <th class="ps-4 py-3 text-muted x-small fw-bold text-uppercase ls-wide">Incident Identifier</th>
                <th class="py-3 text-muted x-small fw-bold text-uppercase ls-wide">Associated Policy</th>
                <th class="py-3 text-muted x-small fw-bold text-uppercase ls-wide text-center">Event Date</th>
                <th class="py-3 text-muted x-small fw-bold text-uppercase ls-wide text-end">Assessment</th>
                <th class="py-3 text-muted x-small fw-bold text-uppercase ls-wide text-center">Status</th>
                <th class="pe-4 py-3 text-end"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of filtered" class="transition" style="cursor:pointer;" (click)="openDetail(c)">
                <td class="ps-4">
                  <div class="d-flex align-items-center gap-3">
                    <div class="stat-icon bg-light text-primary sm rounded-circle"><i class="bi bi-file-earmark-medical"></i></div>
                    <code class="text-primary fw-bold small">{{ c.claimNumber || 'CLM-' + c.id }}</code>
                  </div>
                </td>
                <td>
                  <div class="badge bg-light-soft text-dark rounded-pill border px-2 py-1 x-small fw-mono">
                    {{ getPolicyNumber(c.policyId) }}
                  </div>
                </td>
                <td class="text-center text-muted small fw-bold">
                  {{ c.incidentDate | date:'mediumDate' }}
                </td>
                <td class="text-end fw-bold text-dark">
                  ₹{{ c.claimAmount | number:'1.2-2' }}
                </td>
                <td class="text-center">
                  <span class="badge rounded-pill px-3 py-1" [ngClass]="badgeClass(c.status)">{{ c.status }}</span>
                </td>
                <td class="pe-4 text-end">
                  <div class="stat-icon bg-light text-muted sm rounded-circle d-inline-flex pointer"><i class="bi bi-chevron-right"></i></div>
                </td>
              </tr>
              <tr *ngIf="filtered.length === 0">
                <td colspan="6" class="text-center py-5">
                  <div class="stat-icon bg-light text-muted mx-auto mb-3" style="width:56px; height:56px;">
                    <i class="bi bi-inbox fs-3"></i>
                  </div>
                  <h6 class="fw-bold text-muted">No Claims Found in this Category</h6>
                  <p class="x-small text-muted mb-0">Try selecting a different status filter or initiate a new claim.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detail Modal -->
      <div *ngIf="selectedClaim" class="modal-glass fade-in" (click)="selectedClaim = null">
        <div class="modal-glass-content p-0" (click)="$event.stopPropagation()">
            <div class="modal-header border-0 pb-0 px-4 pt-4">
               <div class="d-flex align-items-center gap-2">
                 <div class="stat-icon bg-primary text-white sm rounded-circle"><i class="bi bi-briefcase-fill"></i></div>
                 <h5 class="modal-title fw-bold m-0">Claim Review</h5>
               </div>
               <button type="button" class="btn-close" (click)="selectedClaim = null"></button>
            </div>
            <div class="modal-body p-4 pt-3">
              <div class="d-flex align-items-center justify-content-between mb-4 bg-light-soft p-3 rounded-4 border">
                <span class="badge rounded-pill px-3 py-2" [ngClass]="badgeClass(selectedClaim.status)">
                  {{ selectedClaim.status }}
                </span>
                <code class="text-primary fw-bold">{{ selectedClaim.claimNumber }}</code>
              </div>
              
              <div class="row g-4 mb-4">
                <div class="col-6">
                  <label class="x-small text-muted fw-bold text-uppercase ls-wide d-block">Policy Reference</label>
                  <span class="fw-bold text-dark">{{ getPolicyNumber(selectedClaim.policyId) }}</span>
                </div>
                <div class="col-6 text-end">
                  <label class="x-small text-muted fw-bold text-uppercase ls-wide d-block">Incident Timeline</label>
                  <span class="fw-bold text-dark">{{ selectedClaim.incidentDate | date:'mediumDate' }}</span>
                </div>
                <div class="col-6">
                  <label class="x-small text-muted fw-bold text-uppercase ls-wide d-block">Submission Logged</label>
                  <span class="fw-medium text-muted small">{{ selectedClaim.createdAt | date:'MMM d, y, h:mm a' }}</span>
                </div>
                <div class="col-6 text-end">
                  <label class="x-small text-muted fw-bold text-uppercase ls-wide d-block">Claimed Valuation</label>
                  <span class="fw-bold text-primary fs-5">₹{{ selectedClaim.claimAmount | number:'1.2-2' }}</span>
                </div>
              </div>

              <div class="incident-narrative mt-2">
                <label class="x-small text-muted fw-bold text-uppercase ls-wide d-block mb-2">Adjuster Narrative</label>
                <div class="p-3 bg-light rounded-4 border small text-dark" style="line-height: 1.6;">
                  {{ selectedClaim.description }}
                </div>
              </div>
            </div>
            <div class="modal-footer border-0 pt-0 pb-4 justify-content-center">
              <button class="btn btn-primary rounded-pill px-5 fw-bold shadow" (click)="selectedClaim = null">Acknowledge</button>
            </div>
        </div>
      </div>
    </div>
  `
})
export class ClaimsComponent implements OnInit {
  claims: Claim[] = [];
  filtered: Claim[] = [];
  policies: Policy[] = [];
  loading = true;
  error = '';
  activeTab = 'All';
  tabs = ['All', 'Pending', 'In Review', 'Approved', 'Rejected'];
  selectedClaim: Claim | null = null;

  getPolicyNumber(policyId: string): string {
    return this.policies.find(p => p.id === policyId)?.policyNumber ?? policyId.slice(0, 8).toUpperCase();
  }

  constructor(private claimService: ClaimService, private policyService: PolicyService, public locale: LocaleService) {}

  ngOnInit(): void {
    this.loadData();
    this.policyService.getPolicies().subscribe({
      next: (res) => this.policies = res.items,
      error: () => this.policies = []
    });
  }

  loadData(): void {
    this.claimService.getClaims().subscribe({
      next: (res) => { this.claims = res.items; this.applyFilter(); this.loading = false; },
      error: () => {
        this.error = 'Could not load claims — showing sample data.';
        this.claims = [
          { id: 1, claimNumber: 'CLM-005678', policyId: '1', description: 'Rear-end collision on highway', status: 'In Review', claimAmount: 3500, incidentDate: '2024-02-15', createdAt: '2024-02-16' },
          { id: 2, claimNumber: 'CLM-005679', policyId: '2', description: 'Burst pipe in kitchen', status: 'Approved', claimAmount: 1200, incidentDate: '2024-01-10', createdAt: '2024-01-11' },
          { id: 3, claimNumber: 'CLM-005680', policyId: '1', description: 'Vehicle stolen from parking lot', status: 'Pending', claimAmount: 25000, incidentDate: '2024-03-01', createdAt: '2024-03-02' },
          { id: 4, claimNumber: 'CLM-005681', policyId: '2', description: 'Kitchen fire damage', status: 'Rejected', claimAmount: 8000, incidentDate: '2023-11-20', createdAt: '2023-11-21' },
        ];
        this.applyFilter();
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    const tabMap: Record<string, string[]> = {
      'All': [],
      'Pending': ['Pending', 'Submitted'],
      'In Review': ['In Review', 'UnderReview', 'Under Review'],
      'Approved': ['Approved'],
      'Rejected': ['Rejected']
    };
    if (this.activeTab === 'All') {
      this.filtered = this.claims;
    } else {
      const allowed = tabMap[this.activeTab] || [this.activeTab];
      this.filtered = this.claims.filter(c => allowed.includes(c.status));
    }
  }

  countByStatus(tab: string): number {
    if (tab === 'All') return 0;
    const tabMap: Record<string, string[]> = {
      'Pending': ['Pending', 'Submitted'],
      'In Review': ['In Review', 'UnderReview', 'Under Review'],
      'Approved': ['Approved'],
      'Rejected': ['Rejected']
    };
    const allowed = tabMap[tab] || [tab];
    return this.claims.filter(c => allowed.includes(c.status)).length;
  }

  openDetail(claim: Claim): void {
    this.selectedClaim = claim;
  }

  badgeClass(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'badge-pending',
      'Submitted': 'badge-pending',
      'In Review': 'badge-in-review',
      'UnderReview': 'badge-in-review',
      'Under Review': 'badge-in-review',
      'Approved': 'badge-approved',
      'Rejected': 'badge-rejected',
      'Draft': 'bg-secondary'
    };
    return map[status] ?? 'bg-secondary';
  }
}
