import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toasts$ = new BehaviorSubject<Toast[]>([]);
  private counter = 0;

  getToasts() {
    return this.toasts$.asObservable();
  }

  show(type: Toast['type'], title: string, message: string, duration = 5000) {
    const id = ++this.counter;
    const toast: Toast = { id, type, title, message };
    
    const current = this.toasts$.getValue();
    this.toasts$.next([...current, toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  success(title: string, message: string) {
    this.show('success', title, message);
  }

  error(title: string, message: string) {
    this.show('error', title, message);
  }

  info(title: string, message: string) {
    this.show('info', title, message);
  }

  warning(title: string, message: string) {
    this.show('warning', title, message);
  }

  remove(id: number) {
    const current = this.toasts$.getValue();
    this.toasts$.next(current.filter(t => t.id !== id));
  }
}
