import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PolicyService } from '../../../services/policy.service';
import { InsuranceType, InsuranceSubType } from '../../../models/models';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-manage-insurance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 class="fw-bold text-dark m-0">Insurance Catalog</h4>
          <p class="text-muted small mb-0">Configure primary insurance categories and specific plan subtypes</p>
        </div>
        <button class="btn btn-primary rounded-pill px-4 shadow-sm" (click)="openTypeModal()">
          <i class="bi bi-plus-lg me-2"></i> New Category
        </button>
      </div>

      <div *ngIf="loading" class="text-center py-5">
        <div class="spinner-border spinner-border-sm text-primary"></div>
        <div class="mt-2 text-muted small">Loading catalog architecture...</div>
      </div>

      <div *ngIf="!loading" class="row g-4">
        <div class="col-12" *ngFor="let type of insuranceTypes">
          <div class="card border-0 shadow-sm overflow-hidden">
            <!-- Category Header -->
            <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center px-4">
              <div class="d-flex align-items-center gap-3">
                <div class="stat-icon bg-primary-lite text-primary sm"><i class="bi bi-collection"></i></div>
                <div>
                  <h6 class="fw-bold m-0 text-dark">{{ type.name }}</h6>
                  <span class="text-muted x-small">{{ type.description || 'No description provided.' }}</span>
                  <span class="badge ms-2 rounded-pill" [ngClass]="type.isActive ? 'badge-approved' : 'badge-rejected'">
                    {{ type.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-sm" (click)="openSubTypeModal(type)">
                  <i class="bi bi-plus-circle me-1"></i> Add Plan
                </button>
                <div class="btn-group btn-group-sm rounded-pill overflow-hidden border shadow-sm">
                  <button class="btn btn-outline-primary border-0" (click)="editType(type)" title="Edit Category"><i class="bi bi-pencil-square"></i></button>
                  <button class="btn btn-outline-danger border-0" (click)="deleteType(type.id)" title="Disable Category"><i class="bi bi-trash3"></i></button>
                </div>
              </div>
            </div>

            <!-- SubTypes Table -->
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0 small">
                <thead class="bg-light-soft">
                  <tr>
                    <th class="ps-4">Plan Name</th>
                    <th>Product Description</th>
                    <th>Base Premium</th>
                    <th>Status</th>
                    <th class="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let sub of type.subTypes">
                    <td class="ps-4 fw-bold text-dark">{{ sub.name }}</td>
                    <td class="text-muted">{{ sub.description }}</td>
                    <td class="fw-semibold">₹{{ sub.basePremium | number:'1.2-2' }}</td>
                    <td>
                      <span class="badge rounded-pill" [ngClass]="sub.isActive ? 'badge-approved' : 'badge-rejected'">
                        {{ sub.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="text-end pe-4">
                      <div class="btn-group btn-group-sm rounded shadow-sm overflow-hidden border">
                        <button class="btn btn-white border-0" (click)="editSubType(sub)" title="Edit Plan">
                          <i class="bi bi-pencil-square text-primary"></i>
                        </button>
                        <button class="btn btn-white border-0" (click)="deleteSubType(sub.id)" title="Remove Plan">
                          <i class="bi bi-trash3 text-danger"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="!type.subTypes || type.subTypes.length === 0">
                    <td colspan="5" class="text-center text-muted py-4 small italic">
                      <i class="bi bi-info-circle me-1"></i>No specific plans configured for this category yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Modal -->
      <div class="modal-glass fade-in" *ngIf="showTypeModal" (click)="closeModals()">
        <div class="modal-glass-content" (click)="$event.stopPropagation()" style="max-width: 500px;">
            <div class="modal-header border-0 pb-0 px-4 pt-4">
              <h5 class="modal-title fw-bold">
                <i class="bi bi-plus-circle-dotted me-2 text-primary"></i>
                {{ editingType ? 'Update' : 'Initialize' }} Category
              </h5>
              <button class="btn-close" (click)="closeModals()"></button>
            </div>
            <div class="modal-body py-4 px-4">
              <div class="mb-4">
                <label class="form-label text-muted small fw-bold text-uppercase ls-wide">Category Name</label>
                <input class="form-control premium-input shadow-sm" [(ngModel)]="typeForm.name" placeholder="e.g. Life Insurance">
              </div>
              <div class="mb-4">
                <label class="form-label text-muted small fw-bold text-uppercase ls-wide">Strategic Description</label>
                <textarea class="form-control premium-textarea shadow-sm" [(ngModel)]="typeForm.description" rows="3" placeholder="Define the scope of this category..."></textarea>
              </div>
              <div class="form-check form-switch" *ngIf="editingType">
                <input class="form-check-input" type="checkbox" role="switch" [(ngModel)]="typeForm.isActive" id="typeActive">
                <label class="form-check-label small fw-bold text-muted" for="typeActive">Category Visibility Active</label>
              </div>
            </div>
            <div class="modal-footer border-0 pt-0 pb-4 gap-2 px-4">
              <button class="btn btn-light rounded-pill px-4" (click)="closeModals()">Cancel</button>
              <button class="btn btn-primary rounded-pill px-4 shadow-sm fw-bold" (click)="saveType()" [disabled]="saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-2"></span>
                {{ editingType ? 'Synchronize Changes' : 'Execute Creation' }}
              </button>
            </div>
        </div>
      </div>

      <!-- Plan SubType Modal -->
      <div class="modal-glass fade-in" *ngIf="showSubTypeModal" (click)="closeModals()">
        <div class="modal-glass-content" (click)="$event.stopPropagation()" style="max-width: 500px;">
            <div class="modal-header border-0 pb-0 px-4 pt-4">
              <h5 class="modal-title fw-bold">
                <i class="bi bi-shield-plus me-2 text-primary"></i>
                {{ editingSubType ? 'Modify' : 'Configure' }} Insurance Plan
              </h5>
              <button class="btn-close" (click)="closeModals()"></button>
            </div>
            <div class="modal-body py-4 px-4">
              <div class="mb-4">
                <label class="form-label text-muted small fw-bold text-uppercase ls-wide">Plan Name</label>
                <input class="form-control premium-input shadow-sm" [(ngModel)]="subTypeForm.name" placeholder="e.g. Platinum Protection">
              </div>
              <div class="mb-4">
                <label class="form-label text-muted small fw-bold text-uppercase ls-wide">Plan Benefits Description</label>
                <textarea class="form-control premium-textarea shadow-sm" [(ngModel)]="subTypeForm.description" rows="3" placeholder="Detailed plan coverage info..."></textarea>
              </div>
              <div class="mb-4">
                <label class="form-label text-muted small fw-bold text-uppercase ls-wide">Monthly Base Premium (₹)</label>
                <div class="input-group shadow-sm">
                  <span class="input-group-text bg-white border-end-0">₹</span>
                  <input class="form-control premium-input border-start-0" type="number" [(ngModel)]="subTypeForm.basePremium" min="0">
                </div>
              </div>
              <div class="form-check form-switch" *ngIf="editingSubType">
                <input class="form-check-input" type="checkbox" role="switch" [(ngModel)]="subTypeForm.isActive" id="subActive">
                <label class="form-check-label small fw-bold text-muted" for="subActive">Plan Availability Active</label>
              </div>
            </div>
            <div class="modal-footer border-0 pt-0 pb-4 gap-2 px-4">
              <button class="btn btn-light rounded-pill px-4" (click)="closeModals()">Cancel</button>
              <button class="btn btn-primary rounded-pill px-4 shadow-sm fw-bold" (click)="saveSubType()" [disabled]="saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-2"></span>
                {{ editingSubType ? 'Apply Config' : 'Deploy Plan' }}
              </button>
            </div>
        </div>
      </div>
    </div>
  `
})
export class ManageInsuranceComponent implements OnInit {
  private policyService = inject(PolicyService);
  private notify = inject(NotificationService);

  insuranceTypes: (InsuranceType & { subTypes: InsuranceSubType[] })[] = [];
  loading = true;
  saving = false;

  showTypeModal = false;
  showSubTypeModal = false;
  editingType: InsuranceType | null = null;
  editingSubType: InsuranceSubType | null = null;
  selectedTypeId: number | null = null;

  typeForm = { name: '', description: '', isActive: true };
  subTypeForm = { name: '', description: '', basePremium: 0, isActive: true };

  ngOnInit(): void { this.loadTypes(); }

  loadTypes(): void {
    this.loading = true;
    this.policyService.getInsuranceTypesAdmin().subscribe({
      next: async (types) => {
        this.insuranceTypes = [];
        for (const t of types) {
          const subs = await this.policyService.getInsuranceSubTypesAdmin(t.id).toPromise() ?? [];
          this.insuranceTypes.push({ ...t, subTypes: subs });
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  openTypeModal(): void {
    this.editingType = null;
    this.typeForm = { name: '', description: '', isActive: true };
    this.showTypeModal = true;
  }

  editType(type: InsuranceType & { subTypes: InsuranceSubType[] }): void {
    this.editingType = type;
    this.typeForm = { name: type.name, description: type.description ?? '', isActive: type.isActive };
    this.showTypeModal = true;
  }

  saveType(): void {
    this.saving = true;
    const obs = this.editingType
      ? this.policyService.updateInsuranceType(this.editingType.id, this.typeForm)
      : this.policyService.createInsuranceType({ name: this.typeForm.name, description: this.typeForm.description });

    obs.subscribe({
      next: () => { this.closeModals(); this.loadTypes(); },
      error: (err) => { this.notify.error('Action Failed', err.error?.errorMessage ?? 'Failed'); this.saving = false; }
    });
  }

  deleteType(id: number): void {
    if (!confirm('Deactivate this insurance type?')) return;
    this.policyService.deleteInsuranceType(id).subscribe({
      next: () => {
        this.notify.success('Category Deactivated', 'The insurance category has been removed from active lookup.');
        this.loadTypes();
      },
      error: (err) => this.notify.error('Action Failed', err.error?.errorMessage ?? 'Failed')
    });
  }

  openSubTypeModal(type: InsuranceType): void {
    this.editingSubType = null;
    this.selectedTypeId = type.id;
    this.subTypeForm = { name: '', description: '', basePremium: 0, isActive: true };
    this.showSubTypeModal = true;
  }

  editSubType(sub: InsuranceSubType): void {
    this.editingSubType = sub;
    this.selectedTypeId = sub.insuranceTypeId;
    this.subTypeForm = { name: sub.name, description: sub.description ?? '', basePremium: sub.basePremium, isActive: sub.isActive };
    this.showSubTypeModal = true;
  }

  saveSubType(): void {
    this.saving = true;
    const obs = this.editingSubType
      ? this.policyService.updateInsuranceSubType(this.editingSubType.id, this.subTypeForm)
      : this.policyService.createInsuranceSubType({ insuranceTypeId: this.selectedTypeId!, ...this.subTypeForm });

    obs.subscribe({
      next: () => { this.closeModals(); this.loadTypes(); },
      error: (err) => { this.notify.error('Action Failed', err.error?.errorMessage ?? 'Failed'); this.saving = false; }
    });
  }

  deleteSubType(id: number): void {
    if (!confirm('Deactivate this subtype?')) return;
    this.policyService.deleteInsuranceSubType(id).subscribe({
      next: () => {
        this.notify.success('Plan Deactivated', 'The specific insurance plan has been offline.');
        this.loadTypes();
      },
      error: (err) => this.notify.error('Action Failed', err.error?.errorMessage ?? 'Failed')
    });
  }

  closeModals(): void {
    this.showTypeModal = false;
    this.showSubTypeModal = false;
    this.saving = false;
  }
}
