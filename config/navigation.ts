import { 
  LayoutDashboard, 
  Map as MapIcon, 
  MessageSquare, 
  FolderOpen, 
  UserCheck, 
  Shield, 
  Users, 
  FileText, 
  CreditCard, 
  FileDiff, 
  DollarSign, 
  Eye, 
  Briefcase, 
  CalendarClock, 
  Hammer, 
  Navigation, 
  Camera, 
  ClipboardList, 
  HardHat, 
  BarChart3, 
  ClipboardCheck, 
  Package, 
  PackageSearch, 
  Layers, 
  Truck, 
  Scale, 
  Trees, 
  Mail 
} from 'lucide-react';
import { UserRole, Permission, User, UserWithPermissions } from '../types';

export interface NavItem {
  id: string;
  label: string;
  icon: any;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const getNavigationGroups = (currentUser: User | UserWithPermissions): NavGroup[] => {
  const userRole = (currentUser.role || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager' || userRole === 'project manager' || userRole === 'project_manager';
  
const overviewItems: NavItem[] = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard }, 
    { id: 'gis-road', label: 'GIS-Road', icon: Navigation },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: Package }
  ];
  
  const adminItems: NavItem[] = [];
  const permissions = (currentUser as UserWithPermissions).permissions || [];
  
  if (permissions.includes(Permission.USER_READ)) {
    adminItems.push({ id: 'user-management', label: 'User Management', icon: UserCheck });
    adminItems.push({ id: 'user-activity', label: 'User Activity', icon: ClipboardList });
    adminItems.push({ id: 'staff-management', label: 'Staff Management', icon: Users });
  }
  
  if (permissions.includes(Permission.USER_CREATE)) {
    adminItems.push({ id: 'user-registration', label: 'Create Account', icon: Shield });
  }

  const groups: NavGroup[] = [
    { title: 'Project Overview', items: overviewItems },
{ title: 'Commercial & Finance', items: [
        { id: 'boq', label: 'BOQ Ledger', icon: FileText },
        { id: 'measurement-sheets', label: 'Measurement Sheets', icon: ClipboardList },
        { id: 'billing', label: 'Billing & Invoicing', icon: CreditCard },
        { id: 'variations', label: 'Amendments', icon: FileDiff },
        { id: 'financials', label: 'Financials & Commercial', icon: DollarSign },
        { id: 'interim-payments', label: 'Interim Payments', icon: CreditCard },
        { id: 'ocr-extraction', label: 'Chandra OCR', icon: Eye }
    ]},
    { title: 'Resource Management', items: [
        { id: 'agencies', label: 'Vendors & Agencies', icon: Briefcase },
        { id: 'subcontractors', label: 'Subcontractors', icon: Briefcase },
        { id: 'subcontractor-billing', label: 'Subcontractor Billing', icon: CreditCard }
    ]},
    { title: 'Field Operations', items: [
        { id: 'schedule', label: 'CPM Schedule', icon: CalendarClock }, 
        { id: 'construction', label: 'Structural', icon: Hammer }, 
        { id: 'linear-works', label: 'Chainage Progress', icon: Navigation }, 
        { id: 'site-photos', label: 'Visual Intel', icon: Camera },
        { id: 'daily-reports', label: 'Field DPR', icon: ClipboardList },
        { id: 'pre-construction', label: 'Pre-Construction', icon: HardHat },
        { id: 'reports-analytics', label: 'Reports & Analytics', icon: BarChart3 },
        { id: 'mpr-report', label: 'Monthly Reports', icon: FileText }
    ]},
{ title: 'Quality & Engineering', items: [
        { id: 'rfis', label: 'Inspections', icon: ClipboardCheck },
        { id: 'materials-hub', label: 'Project Materials', icon: Package },
        { id: 'inventory-sync', label: 'Inventory Sync', icon: Package },
        { id: 'assets', label: 'Assets & Equipment', icon: PackageSearch },
        { id: 'resource-matrix', label: 'Resource Matrix', icon: Layers },
        { id: 'fleet', label: 'Telemetry', icon: Truck },
        { id: 'quality', label: 'Quality Hub', icon: Shield },
        { id: 'lab', label: 'Material Testing', icon: Scale },
        { id: 'environment', label: 'EMP Compliance', icon: Trees },
        { id: 'data-analysis', label: 'Data Analysis', icon: BarChart3 }
    ]}
  ];

  // Add new Documentation group
  groups.push({
    title: 'Documentation',
    items: [
      { id: 'documentation-hub', label: 'Document Hub', icon: FolderOpen } // Added Document Hub item
    ]
  });

  if (adminItems.length > 0) {
    groups.push({ title: 'Administration', items: adminItems });
  }

  return groups;
};
