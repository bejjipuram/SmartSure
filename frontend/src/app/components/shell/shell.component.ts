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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <span class="logo-text">SmartSure</span>
      </div>

      <nav class="sidebar-nav mt-3">
        <a *ngFor="let item of navItems"
           [routerLink]="item.path"
           [routerLinkActiveOptions]="{exact: item.path === '/claims' || item.path === '/policies' || item.path === '/dashboard'}"
           routerLinkActive="active"
           class="nav-link-item"
           (click)="closeSidebar()">
          <i [class]="'bi ' + item.icon"></i>
          <span>{{ item.label }}</span>
        </a>
      </nav>

      <div class="mt-auto p-3">
        <button class="nav-link-item w-100 border-0 bg-transparent text-danger-hover" (click)="logout()">
          <i class="bi bi-box-arrow-left"></i>
          <span>Logout</span>
        </button>
      </div>
    </aside>

    <!-- Main wrapper -->
    <div class="main-wrapper">
      <!-- Top bar -->
      <header class="topbar">
        <div class="d-flex align-items-center gap-4">
          <button class="d-lg-none btn btn-light glass shadow-none p-2 border-0" (click)="toggleSidebar()">
            <i class="bi bi-list fs-4"></i>
          </button>
          <div class="d-flex flex-column">
            <span class="topbar-title">{{ pageTitle }}</span>
            <span class="text-muted small d-none d-md-block">Welcome back, {{ userName }}</span>
          </div>
        </div>
        
        <div class="d-flex align-items-center gap-3">
          <div class="d-none d-sm-flex flex-column align-items-end me-2">
            <span class="fw-bold small">{{ userName }}</span>
            <span class="badge bg-primary-lite rounded-pill py-0 px-2" style="font-size: 0.65rem; font-weight: 800;">
              {{ userRole }}
            </span>
          </div>
          <div class="user-avatar shadow-sm border border-2 border-white">
            {{ userInitials }}
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="page-content fade-in">
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
