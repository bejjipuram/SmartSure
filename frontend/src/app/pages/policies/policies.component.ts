import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PolicyService } from '../../services/policy.service';
import { LocaleService } from '../../services/locale.service';
import { Policy } from '../../models/models';

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 class="fw-bold text-dark m-0">My Protection Portfolio</h4>
          <p class="text-muted small mb-0">Overview of your active and historical insurance contracts</p>
        </div>
        <div class="d-flex gap-3">
          <div class="search-container">
            <i class="bi bi-search search-icon"></i>
            <input type="text" 
                   class="form-control search-input" 
                   placeholder="Search policy identifier..." 
                   [(ngModel)]="searchTerm" 
                   (ngModelChange)="applyFilters()">
          </div>
          <select class="form-select status-select shadow-sm" [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()">
            <option value="All">All Status</option>
            <option value="Active">Active Only</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      <div *ngIf="loading" class="text-center py-5">
        <div class="spinner-border spinner-border-sm text-primary"></div>
        <div class="mt-2 text-muted small">Accessing secure policy vault...</div>
      </div>

      <div *ngIf="error && policies.length === 0" class="alert badge-pending border-0 shadow-sm py-3 mb-4">
        <i class="bi bi-info-circle-fill me-2"></i>{{ error }}
      </div>

      <div *ngIf="!loading && filtered.length === 0" class="text-center py-5 slide-up">
        <div class="stat-icon bg-light text-muted mx-auto mb-3" style="width:64px; height:64px; border-radius: 20px;">
          <i class="bi bi-shield-slash fs-2"></i>
        </div>
        <h5 class="fw-bold text-dark">No Policies Detected</h5>
        <p class="text-muted small">We couldn't find any policies matching your criteria.</p>
      </div>

      <div class="row g-4 slide-up">
        <div class="col-sm-6 col-xl-4" *ngFor="let p of filtered">
          <div class="card border-0 shadow-sm h-100 policy-vault-card transition" (click)="viewDetail(p.id)">
            <div class="card-body p-4">
              <div class="d-flex align-items-start justify-content-between mb-4">
                <div class="d-flex align-items-center gap-3">
                  <div class="stat-icon bg-primary-lite text-primary sm rounded-circle">
                    <i [class]="'bi ' + typeIcon(p.subType?.insuranceTypeId)"></i>
                  </div>
                  <div>
                    <div class="fw-bold text-dark">{{ p.subType?.name || 'Standard Cover' }}</div>
                    <code class="text-primary x-small fw-bold">{{ p.policyNumber || 'POL-SECURE' }}</code>
                  </div>
                </div>
                <span class="badge rounded-pill" [ngClass]="badgeClass(p.status)">{{ p.status }}</span>
              </div>

              <div class="asset-context mb-4 p-3 bg-light-soft rounded-3 border">
                 <ng-container *ngIf="p.vehicleDetails">
                   <div class="text-muted x-small fw-bold text-uppercase ls-wide mb-1">Protected Asset</div>
                   <div class="fw-bold text-dark small truncate-text">{{ p.vehicleDetails.year }} {{ p.vehicleDetails.make }} {{ p.vehicleDetails.model }}</div>
                   <div class="text-primary x-small fw-mono mt-1">{{ p.vehicleDetails.licensePlate }}</div>
                 </ng-container>
                 <ng-container *ngIf="p.homeDetails">
                   <div class="text-muted x-small fw-bold text-uppercase ls-wide mb-1">Insured Location</div>
                   <div class="fw-bold text-dark small text-truncate">{{ p.homeDetails.propertyAddress }}</div>
                 </ng-container>
              </div>

              <div class="d-flex justify-content-between align-items-center mb-0 mt-2">
                 <div>
                    <div class="text-muted x-small fw-bold">ANNUALIZED PREMIUM</div>
                    <div class="fw-bold text-dark">₹{{ p.premiumAmount | number:'1.2-2' }}</div>
                 </div>
                 <div class="text-end">
                    <div class="text-muted x-small fw-bold">TERM LOGS</div>
                    <div class="x-small fw-bold text-muted">{{ p.endDate | date:'MMM y' }}</div>
                 </div>
              </div>
              
              <div class="mt-4 pt-3 border-top d-flex align-items-center justify-content-center text-primary x-small fw-bold gap-2">
                 <i class="bi bi-qr-code"></i> VIEW DIGITAL CERTIFICATE
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Policy Detail Modal -->
      <div *ngIf="selectedPolicy" class="modal-glass fade-in" (click)="selectedPolicy = null">
        <div class="modal-glass-content" (click)="$event.stopPropagation()" style="max-width: 800px;">
            <div class="modal-header border-0 pb-0 px-4 pt-4">
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-shield-check fs-4 text-primary"></i>
                <div>
                  <h5 class="modal-title fw-bold m-0">Policy Specification</h5>
                  <code class="text-muted x-small">{{ selectedPolicy.policyNumber }}</code>
                </div>
              </div>
              <button class="btn-close" (click)="selectedPolicy = null"></button>
            </div>
            <div class="modal-body p-4 pt-2">
              <div *ngIf="detailLoading" class="text-center py-5">
                <div class="spinner-border text-primary"></div>
              </div>
              <div *ngIf="!detailLoading">
                <div class="d-flex gap-2 mb-4">
                  <span class="badge rounded-pill px-3 py-2" [ngClass]="badgeClass(selectedPolicy.status)">{{ selectedPolicy.status }}</span>
                  <span class="badge bg-light-soft text-primary rounded-pill px-3 py-2 border">{{ selectedPolicy.subType?.name }}</span>
                </div>
                
                <div class="row g-3 mb-5">
                  <div class="col-md-3 col-6">
                    <div class="metric-mini p-3 bg-light-soft rounded-4 text-center border">
                      <div class="text-muted x-small fw-bold text-uppercase ls-wide mb-1">Premium</div>
                      <div class="fw-bold text-primary">₹{{ selectedPolicy.premiumAmount | number:'1.2-2' }}</div>
                    </div>
                  </div>
                  <div class="col-md-3 col-6">
                    <div class="metric-mini p-3 bg-light-soft rounded-4 text-center border">
                      <div class="text-muted x-small fw-bold text-uppercase ls-wide mb-1">Coverage</div>
                      <div class="fw-bold text-success">₹{{ selectedPolicy.insuredDeclaredValue | number:'1.2-2' }}</div>
                    </div>
                  </div>
                   <div class="col-md-3 col-6">
                    <div class="metric-mini p-3 bg-light-soft rounded-4 text-center border">
                      <div class="text-muted x-small fw-bold text-uppercase ls-wide mb-1">Inception</div>
                      <div class="fw-bold text-dark small">{{ selectedPolicy.startDate | date:'mediumDate' }}</div>
                    </div>
                  </div>
                   <div class="col-md-3 col-6">
                    <div class="metric-mini p-3 bg-light-soft rounded-4 text-center border">
                      <div class="text-muted x-small fw-bold text-uppercase ls-wide mb-1">Expiration</div>
                      <div class="fw-bold text-danger small">{{ selectedPolicy.endDate | date:'mediumDate' }}</div>
                    </div>
                  </div>
                </div>

                <div class="specification-grid" *ngIf="selectedPolicy.vehicleDetails">
                  <h6 class="fw-bold text-dark mb-3"><i class="bi bi-car-front-fill me-2 text-primary"></i>Protected Vehicle Registry</h6>
                  <div class="card border-0 bg-light-soft rounded-4 p-4">
                    <div class="row g-4">
                      <div class="col-md-4 col-6">
                        <label class="x-small text-muted fw-bold text-uppercase ls-wide d-block">Manufacturer</label>
                        <span class="fw-bold text-dark">{{ selectedPolicy.vehicleDetails.make }}</span>
                      </div>
                      <div class="col-md-4 col-6">
                        <label class="x-small text-muted fw-bold text-uppercase ls-wide d-block">Model Range</label>
                        <span class="fw-bold text-dark">{{ selectedPolicy.vehicleDetails.model }}</span>
                      </div>
                      <div class="col-md-4 col-6">
                        <label class="x-small text-muted fw-bold text-uppercase ls-wide d-block">Plate Number</label>
                        <span class="fw-mono text-primary fw-bold">{{ selectedPolicy.vehicleDetails.licensePlate }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="specification-grid" *ngIf="selectedPolicy.homeDetails">
                  <h6 class="fw-bold text-dark mb-3"><i class="bi bi-house-fill me-2 text-primary"></i>Real Estate Portfolio Asset</h6>
                  <div class="card border-0 bg-light-soft rounded-4 p-4">
                    <div class="row g-4">
                      <div class="col-12">
                        <label class="x-small text-muted fw-bold text-uppercase ls-wide d-block">Deeded Location</label>
                        <span class="fw-bold text-dark">{{ selectedPolicy.homeDetails.propertyAddress }}</span>
                      </div>
                      <div class="col-md-6 col-6">
                        <label class="x-small text-muted fw-bold text-uppercase ls-wide d-block">Market Valuation</label>
                        <span class="fw-bold text-dark">₹{{ selectedPolicy.homeDetails.propertyValue | number:'1.2-2' }}</span>
                      </div>
                      <div class="col-md-6 col-6">
                        <label class="x-small text-muted fw-bold text-uppercase ls-wide d-block">Architecture Year</label>
                        <span class="fw-bold text-dark">{{ selectedPolicy.homeDetails.yearBuilt }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer border-0 pt-0 pb-4 px-4">
              <button class="btn btn-primary rounded-pill px-4 shadow-sm" (click)="selectedPolicy = null">Close Specification</button>
            </div>
        </div>
      </div>
    </div>
  `
})
export class PoliciesComponent implements OnInit {
  policies: Policy[] = [];
  filtered: Policy[] = [];
  loading = true;
  error = '';
  searchTerm = '';
  statusFilter = 'All';
  selectedPolicy: any = null;
  detailLoading = false;

  constructor(private policyService: PolicyService, public locale: LocaleService) {}

  ngOnInit(): void {
    this.policyService.getPolicies().subscribe({
      next: (res) => { this.policies = res.items; this.applyFilters(); this.loading = false; },
      error: () => {
        this.error = 'Could not load policies — backend not connected. Showing sample data.';
        this.policies = [
          { id: '1', policyNumber: 'POL-082411', status: 'Active', premiumAmount: 129.99, insuredDeclaredValue: 6499, startDate: '2024-01-01', endDate: '2025-01-01', subType: { id: 1, name: 'Premium Auto', basePremium: 100, insuranceTypeId: 1 }, vehicleDetails: { make: 'Toyota', model: 'Camry', year: 2020, listedPrice: 800000, licensePlate: 'ABC-1234' } },
          { id: '2', policyNumber: 'POL-082412', status: 'Active', premiumAmount: 89.99, insuredDeclaredValue: 89990, startDate: '2024-03-01', endDate: '2025-03-01', subType: { id: 2, name: 'Standard Home', basePremium: 80, insuranceTypeId: 2 }, homeDetails: { propertyAddress: '123 Main St', propertyValue: 250000 } },
        ];
        this.applyFilters();
        this.loading = false;
      }
    });
  }

  viewDetail(id: string): void {
    this.detailLoading = true;
    this.selectedPolicy = { policyNumber: '...' };
    this.policyService.getPolicyById(id).subscribe({
      next: (p) => { this.selectedPolicy = p; this.detailLoading = false; },
      error: () => { this.detailLoading = false; }
    });
  }

  applyFilters(): void {
    let list = this.policies;
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.policyNumber?.toLowerCase().includes(q) ?? false) ||
        (p.subType?.name.toLowerCase().includes(q) ?? false) ||
        (p.vehicleDetails?.make.toLowerCase().includes(q) ?? false) ||
        (p.vehicleDetails?.model.toLowerCase().includes(q) ?? false)
      );
    }
    if (this.statusFilter !== 'All') list = list.filter(p => p.status === this.statusFilter);
    this.filtered = list;
  }

  badgeClass(status: string): string {
    const map: Record<string, string> = {
      'Active': 'badge-active',
      'Pending': 'badge-pending',
      'Expired': 'badge-expired',
      'Cancelled': 'badge-rejected'
    };
    return map[status] ?? 'bg-secondary';
  }

  typeIcon(typeId: number | undefined): string {
    const map: Record<number, string> = { 1: 'bi-car-front', 2: 'bi-house', 3: 'bi-heart-pulse', 4: 'bi-activity' };
    return map[typeId ?? 0] ?? 'bi-shield';
  }
}
