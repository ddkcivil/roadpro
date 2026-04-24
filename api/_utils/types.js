export var RFIStatus;
(function (RFIStatus) {
    RFIStatus["OPEN"] = "Open";
    RFIStatus["APPROVED"] = "Approved";
    RFIStatus["REJECTED"] = "Rejected";
    RFIStatus["PENDING_INSPECTION"] = "Pending Inspection";
    RFIStatus["CLOSED"] = "Closed";
})(RFIStatus || (RFIStatus = {}));
export var WorkCategory;
(function (WorkCategory) {
    WorkCategory["EARTHWORK"] = "Earthwork";
    WorkCategory["STRUCTURES"] = "Structures";
    WorkCategory["PAVEMENT"] = "Pavement";
    WorkCategory["GENERAL"] = "General";
    WorkCategory["SAFETY"] = "Safety";
    WorkCategory["EXTRA_WORK"] = "Extra Work";
})(WorkCategory || (WorkCategory = {}));
export var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "Admin";
    UserRole["PROJECT_MANAGER"] = "Project Manager";
    UserRole["SITE_ENGINEER"] = "Site Engineer";
    UserRole["LAB_TECHNICIAN"] = "Lab Technician";
    UserRole["HSE_OFFICER"] = "HSE Officer";
    UserRole["SUBCONTRACTOR"] = "Subcontractor";
    UserRole["SUPERVISOR"] = "Supervisor";
})(UserRole || (UserRole = {}));
export var Permission;
(function (Permission) {
    // Project permissions
    Permission["PROJECT_CREATE"] = "project:create";
    Permission["PROJECT_READ"] = "project:read";
    Permission["PROJECT_UPDATE"] = "project:update";
    Permission["PROJECT_DELETE"] = "project:delete";
    // User management permissions
    Permission["USER_CREATE"] = "user:create";
    Permission["USER_READ"] = "user:read";
    Permission["USER_UPDATE"] = "user:update";
    Permission["USER_DELETE"] = "user:delete";
    // Schedule permissions
    Permission["SCHEDULE_CREATE"] = "schedule:create";
    Permission["SCHEDULE_READ"] = "schedule:read";
    Permission["SCHEDULE_UPDATE"] = "schedule:update";
    Permission["SCHEDULE_DELETE"] = "schedule:delete";
    // BOQ permissions
    Permission["BOQ_CREATE"] = "boq:create";
    Permission["BOQ_READ"] = "boq:read";
    Permission["BOQ_UPDATE"] = "boq:update";
    Permission["BOQ_DELETE"] = "boq:delete";
    // RFI permissions
    Permission["RFI_CREATE"] = "rfi:create";
    Permission["RFI_READ"] = "rfi:read";
    Permission["RFI_UPDATE"] = "rfi:update";
    Permission["RFI_DELETE"] = "rfi:delete";
    // Document permissions
    Permission["DOCUMENT_CREATE"] = "document:create";
    Permission["DOCUMENT_READ"] = "document:read";
    Permission["DOCUMENT_UPDATE"] = "document:update";
    Permission["DOCUMENT_DELETE"] = "document:delete";
    // Report permissions
    Permission["REPORT_CREATE"] = "report:create";
    Permission["REPORT_READ"] = "report:read";
    Permission["REPORT_UPDATE"] = "report:update";
    Permission["REPORT_DELETE"] = "report:delete";
    // Finance permissions
    Permission["FINANCE_CREATE"] = "finance:create";
    Permission["FINANCE_READ"] = "finance:read";
    Permission["FINANCE_UPDATE"] = "finance:update";
    Permission["FINANCE_DELETE"] = "finance:delete";
    // Admin permissions
    Permission["SETTINGS_UPDATE"] = "settings:update";
    Permission["BACKUP_MANAGE"] = "backup:manage";
})(Permission || (Permission = {}));
// Consolidated status enums
export var ResourceStatus;
(function (ResourceStatus) {
    ResourceStatus["AVAILABLE"] = "Available";
    ResourceStatus["LOW_STOCK"] = "Low Stock";
    ResourceStatus["OUT_OF_STOCK"] = "Out of Stock";
    ResourceStatus["DISCONTINUED"] = "Discontinued";
    ResourceStatus["ALLOCATED"] = "Allocated";
    ResourceStatus["IN_TRANSIT"] = "In Transit";
    ResourceStatus["RESERVED"] = "Reserved";
    ResourceStatus["RECEIVED"] = "Received";
    ResourceStatus["PENDING"] = "Pending";
    ResourceStatus["VERIFIED"] = "Verified";
    ResourceStatus["ORDERED"] = "Ordered";
    ResourceStatus["DELIVERED"] = "Delivered";
    ResourceStatus["COMPLETED"] = "Completed";
    ResourceStatus["ACTIVE"] = "Active";
    ResourceStatus["MAINTENANCE"] = "Maintenance";
    ResourceStatus["IDLE"] = "Idle";
    ResourceStatus["SUSPENDED"] = "Suspended";
})(ResourceStatus || (ResourceStatus = {}));
export var ResourceType;
(function (ResourceType) {
    ResourceType["MATERIAL"] = "Material";
    ResourceType["LABOR"] = "Labor";
    ResourceType["EQUIPMENT"] = "Equipment";
    ResourceType["SUBCONTRACTOR"] = "Subcontractor";
})(ResourceType || (ResourceType = {}));
export var EntityStatus;
(function (EntityStatus) {
    EntityStatus["DRAFT"] = "Draft";
    EntityStatus["SUBMITTED"] = "Submitted";
    EntityStatus["APPROVED"] = "Approved";
    EntityStatus["PAID"] = "Paid";
    EntityStatus["COMPLETED"] = "Completed";
    EntityStatus["RECEIVED"] = "Received";
    EntityStatus["ISSUED"] = "Issued";
    EntityStatus["CANCELLED"] = "Cancelled";
})(EntityStatus || (EntityStatus = {}));
