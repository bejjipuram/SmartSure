-- Clear existing mirrored data to ensure clean sync with new columns
DELETE FROM SmartSure_AdminDB.dbo.AdminClaims;
DELETE FROM SmartSure_AdminDB.dbo.AdminPolicies;
DELETE FROM SmartSure_AdminDB.dbo.AdminUsers;
DELETE FROM SmartSure_AdminDB.dbo.AuditLogs;

-- Sync Users
INSERT INTO SmartSure_AdminDB.dbo.AdminUsers (UserId, FullName, Email, Role, IsActive, CreatedAt, LastLogin)
SELECT 
    U.UserId,
    U.FullName,
    U.Email,
    'Policyholder' as Role,
    U.IsActive,
    U.CreatedAt,
    U.CreatedAt
FROM SmartSure_IdentityDB.dbo.Users U;

-- Sync Policies
INSERT INTO SmartSure_AdminDB.dbo.AdminPolicies (PolicyId, PolicyNumber, CustomerName, InsuranceType, PremiumAmount, Status, CreatedAt)
SELECT 
    P.Id as PolicyId,
    P.PolicyNumber,
    U.FullName as CustomerName,
    ST.Name as InsuranceType,
    P.PremiumAmount,
    P.Status,
    P.CreatedAt
FROM SmartSure_PolicyDB.dbo.Policies P
JOIN SmartSure_PolicyDB.dbo.InsuranceSubTypes ST ON P.InsuranceSubTypeId = ST.Id
LEFT JOIN SmartSure_IdentityDB.dbo.Users U ON P.UserId = U.UserId;

-- Sync Claims
INSERT INTO SmartSure_AdminDB.dbo.AdminClaims (ClaimId, UserId, CustomerName, PolicyNumber, ClaimNumber, ClaimAmount, Status, IncidentDate, CreatedAt)
SELECT 
    C.Id as ClaimId,
    C.UserId,
    U.FullName as CustomerName,
    P.PolicyNumber,
    C.ClaimNumber,
    C.ClaimAmount,
    C.Status,
    C.IncidentDate,
    C.CreatedAt
FROM SmartSure_ClaimsDB.dbo.Claims C
LEFT JOIN SmartSure_IdentityDB.dbo.Users U ON C.UserId = U.UserId
LEFT JOIN SmartSure_PolicyDB.dbo.Policies P ON C.PolicyId = P.Id;

-- Sync Audit Logs (Dummy/Initial)
INSERT INTO SmartSure_AdminDB.dbo.AuditLogs (UserId, Action, EntityName, EntityId, Details, IpAddress, CreatedAt)
SELECT 
    U.UserId,
    'System Sync',
    'AdminSync',
    '0',
    'Initial data synchronization for Admin Dashboard',
    '127.0.0.1',
    GETDATE()
FROM SmartSure_IdentityDB.dbo.Users U WHERE U.Email LIKE 'admin%';
