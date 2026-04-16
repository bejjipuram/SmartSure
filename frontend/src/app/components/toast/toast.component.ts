import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Toast } from '../../services/notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of toasts$ | async" 
           [class]="'toast ' + toast.type" 
           (click)="remove(toast.id)">
        <div class="toast-icon">
          <span *ngIf="toast.type === 'success'">✓</span>
          <span *ngIf="toast.type === 'error'">✕</span>
          <span *ngIf="toast.type === 'info'">ℹ</span>
          <span *ngIf="toast.type === 'warning'">⚠</span>
        </div>
        <div class="toast-content">
          <div class="toast-title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button class="toast-close">&times;</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      min-width: 320px;
      max-width: 400px;
      padding: 16px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      animation: slideIn 0.3s ease-out forwards;
      transition: all 0.2s ease;
    }

    .toast:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.45);
      background: rgba(255, 255, 255, 0.15);
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .toast-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-weight: bold;
      font-size: 14px;
    }

    .success { border-left: 4px solid #4ade80; }
    .success .toast-icon { background: rgba(74, 222, 128, 0.2); color: #4ade80; }

    .error { border-left: 4px solid #fb7185; }
    .error .toast-icon { background: rgba(251, 113, 133, 0.2); color: #fb7185; }

    .info { border-left: 4px solid #38bdf8; }
    .info .toast-icon { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }

    .warning { border-left: 4px solid #fbbf24; }
    .warning .toast-icon { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }

    .toast-content {
      flex-grow: 1;
    }

    .toast-title {
      font-weight: 600;
      font-size: 15px;
      color: #fff;
      margin-bottom: 2px;
    }

    .toast-message {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.4;
    }

    .toast-close {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    .toast-close:hover {
      color: #fff;
    }
  `]
})
export class ToastComponent {
  toasts$: Observable<Toast[]>;

  constructor(private notificationService: NotificationService) {
    this.toasts$ = this.notificationService.getToasts();
  }

  remove(id: number) {
    this.notificationService.remove(id);
  }
}
