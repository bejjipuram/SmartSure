import { Component, OnInit, HostListener } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { LocaleService } from '../../services/locale.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, FormsModule],
  template: `
    <!-- Sidebar overlay (mobile) -->
    <div class="sidebar-overlay" [class.d-block]="sidebarOpen" (click)="closeSidebar()"></div>

    <!-- Sidebar -->
    <aside class="sidebar" [class.open]="sidebarOpen">
      <div class="sidebar-logo">
        <div class="logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <span class="logo-text">SmartSure</span>
      </div>

      <nav class="sidebar-nav">
        <a *ngFor="let item of navItems"
           [routerLink]="item.path"
           routerLinkActive="active"
           class="nav-link-item"
           (click)="closeSidebar()">
          <i [class]="'bi ' + item.icon"></i>
          {{ item.label }}
        </a>
      </nav>

      <div class="sidebar-footer">
        <button class="nav-link-item w-100 border-0 bg-transparent" (click)="logout()">
          <i class="bi bi-box-arrow-left"></i>
          Logout
        </button>
      </div>
    </aside>

    <!-- Main wrapper -->
    <div class="main-wrapper">
      <!-- Top bar -->
      <header class="topbar">
        <div class="d-flex align-items-center gap-3">
          <button class="d-lg-none btn btn-sm btn-light p-2" (click)="toggleSidebar()">
            <i class="bi bi-list fs-5"></i>
          </button>
          <span class="topbar-title">{{ pageTitle }}</span>
        </div>
        <div class="d-flex align-items-center gap-3">
          <!-- User Role Display -->
          <span class="badge bg-secondary text-white text-uppercase" style="font-size:0.85rem; letter-spacing:0.5px;">
            {{ userRole }}
          </span>
          <div class="user-avatar">{{ userInitials }}</div>
          <span class="d-none d-sm-block text-sm fw-medium text-secondary">{{ userName }}</span>
        </div>
      </header>

      <!-- Page content -->
      <main class="page-content">
        <router-outlet />
      </main>
    </div>
  `
})
export class ShellComponent implements OnInit {
  sidebarOpen = false;
  userInitials = '';
  userName = '';
  pageTitle = 'Dashboard';
  isAdmin = false;
  userRole = '';

  navItems: NavItem[] = [];

  private customerNav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'bi-speedometer2' },
    { label: 'My Policies', path: '/policies', icon: 'bi-file-earmark-text' },
    { label: 'My Claims', path: '/claims', icon: 'bi-exclamation-circle' },
    { label: 'Initiate Claim', path: '/claims/initiate', icon: 'bi-file-earmark-plus' },
    { label: 'Buy Policy', path: '/new-policy', icon: 'bi-cart-plus' },
    { label: 'Profile', path: '/profile', icon: 'bi-person-circle' },
  ];

  private adminNav: NavItem[] = [
    { label: 'Admin Dashboard', path: '/dashboard', icon: 'bi-speedometer2' },
    { label: 'Manage Users', path: '/admin/users', icon: 'bi-people' },
    { label: 'Manage Policies', path: '/admin/policies', icon: 'bi-file-earmark-text' },
    { label: 'All Claims', path: '/admin/claims', icon: 'bi-exclamation-circle' },
    { label: 'Insurance Catalog', path: '/admin/insurance', icon: 'bi-shield-plus' },
    { label: 'Reports', path: '/admin/reports', icon: 'bi-graph-up' },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'bi-shield-lock' },
  ];

  private pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/policies': 'My Policies',
    '/claims': 'My Claims',
    '/claims/initiate': 'Initiate Claim',
    '/new-policy': 'Buy New Policy',
    '/profile': 'Profile',
    '/admin/users': 'Manage Users',
    '/admin/audit-logs': 'Audit Logs',
    '/admin/reports': 'Reports',
    '/admin/insurance': 'Insurance Catalog',
    '/admin/policies': 'Manage Policies',
    '/admin/claims': 'Manage Claims',
  };

  constructor(private auth: AuthService, private router: Router, private locale: LocaleService) {}

  ngOnInit(): void {
    this.userInitials = this.auth.getUserInitials();
    this.userName = this.auth.getUserFullName();
    const user = this.auth.getUser();
    this.userRole = user?.roles?.[0] || 'User';
    this.isAdmin = user?.roles?.includes('Admin') ?? false;
    this.navItems = this.isAdmin ? this.adminNav : this.customerNav;
    this.router.events.subscribe(() => {
      this.updatePageTitle();
    });
    this.updatePageTitle();
  }



  private updatePageTitle(): void {
    const path = this.router.url.split('?')[0]; // Handle query params
    this.pageTitle = this.pageTitles[path] || (this.isAdmin ? 'Admin Panel' : 'SmartSure');
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 992) {
      this.sidebarOpen = false;
    }
  }
}
