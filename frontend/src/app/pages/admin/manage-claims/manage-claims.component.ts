import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ClaimService } from '../../../services/claim.service';
import { LocaleService } from '../../../services/locale.service';
import { AdminClaim, PagedResult } from '../../../models/models';
import { NotificationService } from '../../../services/notification.service';

interface ClaimDocument {
  id: number;
  claimId: number;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

@Component({
  selector: 'app-manage-claims',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-claims.component.html',
  styleUrls: ['./manage-claims.component.css']
})
export class ManageClaimsComponent implements OnInit {
  private claimService = inject(ClaimService);
  private http = inject(HttpClient);
  private notify = inject(NotificationService);
  locale = inject(LocaleService);

  claims: AdminClaim[] = [];
  statusFilter = '';
  page = 1;
  pageSize = 10;
  totalCount = 0;
  loading = true;

  selectedClaim: AdminClaim | null = null;
  documents: ClaimDocument[] = [];
  docsLoading = false;

  // Remarks Modal State
  isRemarksOpen = false;
  remarks = '';
  targetClaimId: number | null = null;
  targetAction: 'approve' | 'reject' | 'review' | null = null;
  processing = false;

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (this.remarks.trim().length > 0) {
      $event.returnValue = true;
    }
  }

  ngOnInit(): void {
    this.loadClaims();
    this.restoreDraft();
  }

  private getDraftKey(): string {
    return `claim_remark_draft_${this.targetClaimId}_${this.targetAction}`;
  }

  onRemarksChange(): void {
    if (this.targetClaimId && this.targetAction) {
      localStorage.setItem(this.getDraftKey(), this.remarks);
    }
  }

  restoreDraft(): void {
    // This could be more generic, but for now we'll check if a modal was open
    // In a real app, you might store which claim was being processed too.
  }

  loadClaims(): void {
    this.loading = true;
    this.claimService.adminGetClaims(this.statusFilter, this.page, this.pageSize).subscribe({
      next: (res: PagedResult<AdminClaim>) => {
        this.claims = res.items;
        this.totalCount = res.totalCount;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  openDetail(claim: AdminClaim): void {
    this.selectedClaim = claim;
    this.documents = [];
    this.docsLoading = true;
    this.http.get<ClaimDocument[]>(`/api/claims/${claim.claimId}/documents`).subscribe({
      next: (docs) => { this.documents = docs; this.docsLoading = false; },
      error: () => { this.docsLoading = false; }
    });
  }

  closeDetail(): void {
    this.selectedClaim = null;
    this.documents = [];
  }

  processClaim(id: number, action: 'approve' | 'reject' | 'review'): void {
    this.targetClaimId = id;
    this.targetAction = action;
    this.isRemarksOpen = true;
    this.remarks = localStorage.getItem(this.getDraftKey()) || '';
  }

  cancelProcess(): void {
    this.isRemarksOpen = false;
    this.targetClaimId = null;
    this.targetAction = null;
    this.remarks = '';
  }

  confirmProcess(): void {
    if (!this.targetClaimId || !this.targetAction) return;

    this.processing = true;
    const obs = this.targetAction === 'approve'
      ? this.claimService.adminApproveClaim(this.targetClaimId, this.remarks)
      : this.targetAction === 'reject'
        ? this.claimService.adminRejectClaim(this.targetClaimId, this.remarks)
        : this.claimService.adminReviewClaim(this.targetClaimId, this.remarks);

    obs.subscribe({
      next: () => {
        const actionLabel = this.targetAction === 'approve' ? 'Approved' : this.targetAction === 'reject' ? 'Rejected' : 'Moved to Review';
        localStorage.removeItem(this.getDraftKey());
        this.processing = false;
        this.notify.success(`Claim ${actionLabel}`, `The claim status has been updated successfully.`);
        this.cancelProcess();
        this.loadClaims();
        this.closeDetail();
      },
      error: (err) => {
        this.processing = false;
        this.notify.error('Operation Failed', err.error?.errorMessage || 'Unknown error');
      }
    });
  }

  changePage(p: number): void { this.page = p; this.loadClaims(); }
  onFilterChange(): void { this.page = 1; this.loadClaims(); }
  get totalPages(): number { return Math.ceil(this.totalCount / this.pageSize); }
}
