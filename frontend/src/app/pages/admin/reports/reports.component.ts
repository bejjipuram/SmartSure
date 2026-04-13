import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PagedResult } from '../../../models/models';

interface Report {
  id: string;
  title: string;
  type: string;
  status: string;
  fileUrl: string;
  createdAt: string;
}

const REPORT_TYPES = [
  {
    type: 'claims',
    label: 'Claims Summary',
    description: 'All claims with status breakdown, amounts and incident dates',
    icon: 'bi-file-earmark-bar-graph',
    color: 'text-primary',
    bg: 'bg-blue-lite',
  },
  {
    type: 'policies',
    label: 'Policy Overview',
    description: 'All policies with premium, insurance type and status',
    icon: 'bi-shield-check',
    color: 'text-warning',
    bg: 'bg-orange-lite',
  },
  {
    type: 'revenue',
    label: 'Total Revenue',
    description: 'Revenue by insurance type with per-policyholder breakdown',
    icon: 'bi-cash-stack',
    color: 'text-success',
    bg: 'bg-green-lite',
  },
  {
    type: 'audit',
    label: 'Audit Log',
    description: 'All admin actions, entity changes and system events',
    icon: 'bi-journal-text',
    color: 'text-purple',
    bg: 'bg-purple-lite',
  },
];

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 class="fw-bold text-dark m-0">Reports & Analytics</h4>
          <p class="text-muted small mb-0">Generate comprehensive PDF summaries and data snapshots</p>
        </div>
      </div>

      <!-- Select report type -->
      <div class="row g-4 mb-5">
        <div class="col-sm-6 col-xl-3" *ngFor="let t of reportTypes">
          <div class="card border-0 shadow-sm h-100 hover-elevate transition"
               style="cursor:pointer;"
               [class.border-primary-glow]="selected?.type === t.type"
               (click)="selectType(t)">
            <div class="card-body p-4">
              <div class="stat-icon mb-3" [ngClass]="t.bg">
                <i class="bi" [ngClass]="[t.icon, t.color]"></i>
              </div>
              <h6 class="fw-bold text-dark mb-2">{{ t.label }}</h6>
              <p class="text-muted x-small mb-3 line-height-sm">{{ t.description }}</p>
              
              <div class="d-flex align-items-center justify-content-between mt-auto">
                <span *ngIf="selected?.type !== t.type" class="text-primary x-small fw-bold">Select Template</span>
                <span *ngIf="selected?.type === t.type" class="badge bg-primary text-white rounded-pill px-3">
                  <i class="bi bi-check2 me-1"></i>Active Selection
                </span>
                <i class="bi bi-chevron-right text-muted small" *ngIf="selected?.type !== t.type"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Configure & Generate -->
      <div class="card border-0 shadow-lg mb-5 overflow-hidden slide-up" *ngIf="selected">
        <div class="card-header bg-primary py-3 px-4 d-flex align-items-center justify-content-between border-0">
          <h6 class="mb-0 fw-bold text-white d-flex align-items-center">
            <i class="bi me-2 fs-5" [ngClass]="selected.icon"></i>
            Generating: {{ selected.label }}
          </h6>
          <button class="btn btn-sm btn-white border-0 shadow-sm rounded-pill px-3" (click)="selected = null">
            Cancel Context
          </button>
        </div>
        <div class="card-body p-4 bg-light-soft">
          <div class="row g-4 align-items-end">
            <div class="col-md-7">
              <label class="form-label text-muted small fw-bold text-uppercase ls-wide">Official Report Designation</label>
              <input class="form-control premium-input shadow-sm"
                     [(ngModel)]="customTitle"
                     [placeholder]="selected.label + ' — ' + today">
            </div>
            <div class="col-md-5 d-flex gap-2">
              <button class="btn btn-primary rounded-pill px-4 flex-grow-1 shadow-sm fw-bold"
                      (click)="generate()"
                      [disabled]="generating">
                <span *ngIf="generating" class="spinner-border spinner-border-sm me-2"></span>
                <i *ngIf="!generating" class="bi bi-lightning-charge-fill me-2"></i>
                {{ generating ? 'Synthesizing...' : 'Execute Generation' }}
              </button>
              
              <button *ngIf="readyBlob" class="btn btn-success rounded-pill px-4 shadow-sm fw-bold" (click)="download()">
                <i class="bi bi-download me-2"></i>Fetch PDF
              </button>
            </div>
          </div>

          <!-- banners -->
          <div *ngIf="readyBlob" class="alert badge-approved border-0 shadow-sm py-3 mt-4 d-flex align-items-center gap-3">
            <i class="bi bi-check-circle-fill fs-4 text-success"></i>
            <div>
              <div class="fw-bold small text-success">Production Ready</div>
              <div class="small">The PDF report has been successfully compiled and is ready for secure download.</div>
            </div>
          </div>

          <div *ngIf="errorMsg" class="alert badge-rejected border-0 shadow-sm py-3 mt-4 d-flex align-items-center gap-3">
            <i class="bi bi-exclamation-octagon-fill fs-4 text-danger"></i>
            <div>
              <div class="fw-bold small text-danger">Process Interrupted</div>
              <div class="small">{{ errorMsg }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- History Table -->
      <div class="card border-0 shadow-sm overflow-hidden">
        <div class="card-header bg-transparent py-3 px-4 border-0 d-flex align-items-center justify-content-between">
          <h6 class="mb-0 fw-bold">Executive Summary History</h6>
          <button class="btn btn-icon btn-white border shadow-none" (click)="loadHistory()" title="Refresh Log">
            <i class="bi bi-arrow-clockwise"></i>
          </button>
        </div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="bg-light-soft">
              <tr>
                <th class="ps-4">Report Designation</th>
                <th>Classification</th>
                <th>Delivery Status</th>
                <th class="text-end pe-4">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="historyLoading">
                <td colspan="4" class="text-center py-5">
                  <div class="spinner-border spinner-border-sm text-primary"></div>
                </td>
              </tr>
              <tr *ngFor="let r of history">
                <td class="ps-4">
                  <div class="fw-bold text-dark small">{{ r.title }}</div>
                </td>
                <td><span class="badge bg-primary-lite text-primary rounded-pill">{{ r.type }}</span></td>
                <td>
                  <span class="badge rounded-pill" [ngClass]="{
                    'badge-approved': r.status === 'Completed' || r.status === 'Generated',
                    'badge-rejected':  r.status === 'Failed',
                    'badge-pending':  r.status === 'Pending'
                  }">{{ r.status }}</span>
                </td>
                <td class="text-end pe-4 text-muted small">{{ r.createdAt | date:'medium' }}</td>
              </tr>
              <tr *ngIf="!historyLoading && history.length === 0">
                <td colspan="4" class="text-center py-5 text-muted small italic">No historical records found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stat-icon { width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .border-primary-glow { box-shadow: 0 0 0 2px var(--primary-color) !important; }
    .bg-purple-lite { background: rgba(139,92,246,0.1); }
    .text-purple    { color: #7c3aed; }
    .bg-blue-lite   { background: rgba(37,99,235,0.1); }
    .bg-green-lite  { background: rgba(16,185,129,0.1); }
    .bg-orange-lite { background: rgba(245,158,11,0.1); }
    .line-height-sm { line-height: 1.4; }
  `]
})
export class ReportsComponent implements OnInit {
  private http = inject(HttpClient);

  reportTypes = REPORT_TYPES;
  selected: typeof REPORT_TYPES[0] | null = null;
  customTitle = '';
  today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  generating = false;
  readyBlob: Blob | null = null;
  errorMsg = '';

  history: Report[] = [];
  historyLoading = true;

  ngOnInit(): void {
    this.loadHistory();
  }

  selectType(t: typeof REPORT_TYPES[0]): void {
    this.selected = t;
    this.customTitle = '';
    this.readyBlob = null;
    this.errorMsg = '';
  }

  generate(): void {
    if (!this.selected || this.generating) return;
    this.generating = true;
    this.readyBlob = null;
    this.errorMsg = '';

    const title = this.customTitle.trim() || `${this.selected.label} — ${this.today}`;

    this.http.post(
      '/api/admin/reports/generate',
      { type: this.selected.type, title },
      { responseType: 'blob' }
    ).subscribe({
      next: (blob) => {
        this.readyBlob = blob;
        this.generating = false;
        // Record in history
        this.http.post('/api/admin/reports', {
          title,
          type: this.selected!.label,
          parameters: ''
        }).subscribe({ error: () => {} });
        this.loadHistory();
      },
      error: () => {
        this.errorMsg = `Failed to generate ${this.selected!.label}. Please try again.`;
        this.generating = false;
      }
    });
  }

  download(): void {
    if (!this.readyBlob || !this.selected) return;
    const url = URL.createObjectURL(this.readyBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selected.type}-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  loadHistory(): void {
    this.historyLoading = true;
    this.http.get<PagedResult<Report>>('/api/admin/reports').subscribe({
      next: (res) => { this.history = res.items; this.historyLoading = false; },
      error: () => { this.historyLoading = false; }
    });
  }
}
