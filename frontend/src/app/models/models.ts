export interface User {
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  roles?: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface Policy {
  id: string;
  policyNumber: string;
  status: string;
  premiumAmount: number;
  insuredDeclaredValue: number;
  startDate: string;
  endDate: string;
  subType?: {
    id: number;
    name: string;
    basePremium: number;
    insuranceTypeId: number;
  };
  vehicleDetails?: {
    make: string;
    model: string;
    year: number;
    listedPrice: number;
    licensePlate: string;
  };
  homeDetails?: {
    propertyAddress: string;
    propertyValue: number;
  };
}

export interface Claim {
  id: number;
  claimNumber: string;
  policyId: string;
  description: string;
  status: string;
  claimAmount: number;
  incidentDate: string;
  createdAt: string;
}

export interface DashboardData {
  activePolicies: number;
  totalPremium: number;
  pendingClaims: number;
  totalClaims: number;
  policyByStatus: { status: string; count: number }[];
  claimByStatus: { status: string; count: number }[];
  claimsByMonth: { month: string; amount: number }[];
  recentPolicies: Policy[];
  recentClaims: Claim[];
}

export interface CreateClaimDto {
  policyId: string;
  incidentDate: string;
  description: string;
  claimAmount: number;
}

export interface CreatePolicyDto {
  subTypeId: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehiclePlateNumber?: string;
}
export interface AdminClaim {
  id: number;
  claimId: number;
  userId: string;
  customerName: string;
  policyNumber: string;
  claimNumber: string;
  claimAmount: number;
  status: string;
  incidentDate: string;
  createdAt: string;
}

export interface AdminPolicy {
  id: number;
  policyId: string;
  policyNumber: string;
  customerName: string;
  insuranceType: string;
  premiumAmount: number;
  insuredDeclaredValue: number;
  status: string;
  createdAt?: string;
}

export interface AdminDashboardData {
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  totalPolicies: number;
  totalRevenue: number;
  activeUsers: number;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  entityName: string;
  entityId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface InsuranceType {
  id: number;
  name: string;
  description: string;
  icon?: string;
  isActive: boolean;
}

export interface InsuranceSubType {
  id: number;
  name: string;
  description: string;
  basePremium: number;
  insuranceTypeId: number;
  isActive: boolean;
}
