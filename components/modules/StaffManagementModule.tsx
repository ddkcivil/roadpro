import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Badge } from '~/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Separator } from '~/components/ui/separator';
import { cn } from '~/lib/utils';
import { formatCurrency } from '../../utils/formatting/currencyUtils';
import { 
  Users, 
  FileText, 
  Calendar, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Plus, 
  Search,
  Download,
  Save,
  User,
  Loader2
} from 'lucide-react';
import { apiService } from '../../services/api/apiService';
import { offlineStorage } from '../../services/database/offlineStorage';
import { usePagination } from '../../hooks/usePagination';
import { PaginationComponent } from '~/components/ui/pagination-component';

// Types
interface PerformanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  period: string; // e.g., "Q1 2024"
  kpiScores: {
    productivity: number;
    quality: number;
    teamwork: number;
    punctuality: number;
    initiative: number;
  };
  overallRating: number;
  comments: string;
  reviewer: string;
  reviewDate: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  signInTime?: string;
  signOutTime?: string;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave';
  hoursWorked?: number;
  overtimeHours?: number;
  remarks?: string;
}

interface TrainingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  courseName: string;
  trainingType: 'Safety' | 'Technical' | 'Soft Skills' | 'Compliance' | 'Leadership';
  provider: string;
  startDate: string;
  endDate: string;
  duration: number; // in hours
  cost: number;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  certificate?: string;
  score?: number;
  feedback?: string;
  trainer?: string;
}

interface EvaluationForm {
  id: string;
  employeeId: string;
  employeeName: string;
  evaluator: string;
  evaluationDate: string;
  period: string;
  overallRating: number;
  strengths: string;
  areasForImprovement: string;
  goals: string;
  recommendations: string;
  nextReviewDate: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Archived';
}

interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  overtimePay: number;
  netSalary: number;
  payPeriod: string; // e.g., "January 2024"
  paymentDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Cheque';
  remarks?: string;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  leaveType: 'Annual' | 'Sick' | 'Home' | 'Maternity/Paternity/Parental' | 'Bereavement' | 'Other';
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  workHandoverTo: string;
  alternateContact: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  recommendedBy?: string;
  supervisorName?: string;
  supervisorSignature?: string;
  hodName?: string;
  hodSignature?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeData {
  // Page 1 - Basic Information
  employeeName: string;
  designation: string;
  department: string;
  workStation: string;
  gender: string;
  nationality: string;
  permanentAddress: string;
  temporaryAddress: string;
  dateOfBirth: string;
  maritalStatus: string;
  bloodGroup: string;
  religion: string;
  personalMobile: string;
  emailAddress: string;
  emergencyContactPerson: string;
  emergencyContactNumber: string;
  
  // Page 2 - Educational Qualifications
  qualifications: Array<{
    degree: string;
    specialization: string;
    completionYear: string;
    duration: string;
    grade: string;
    institute: string;
  }>;
  
  // Page 3 - Work Experience
  workExperience: Array<{
    companyName: string;
    country: string;
    designation: string;
    serviceYears: string;
    remuneration: string;
  }>;
  
  // Page 4 - Banking Information
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  panNumber: string;
  nationalId: string;
  pfNumber: string;
  pfBranch: string;
  citNumber: string;
  citBranch: string;
  retirementAccount: string;
  retirementBank: string;
  ssfNumber: string;
  citizenshipDocument: 'citizenship' | 'passport';
  citizenshipIssueDistrict: string;
  citizenshipIssueOffice: string;
  citizenshipIssueDate: string;
  citizenshipNumber: string;
  drivingLicenseDate: string;
  drivingLicenseNumber: string;
  drivingLicenseCategory: string;
  vehicleType: string;
  vehicleNumber: string;
  previousEmployerLetter: boolean;
  
  // Page 5 - Nominee Information
  nomineeName: string;
  nomineeRelation: string;
  nomineeContact: string;
  nomineePermanentAddress: string;
  nomineeTemporaryAddress: string;
  nomineeDocument: 'citizenship' | 'passport';
  nomineeIssueDistrict: string;
  nomineeIssueOffice: string;
  nomineeIssueDate: string;
  nomineeNumber: string;
  
  // Page 6 - Declarations
  isSingle: boolean;
  isMarried: boolean;
  numberOfSons: number;
  numberOfDaughters: number;
  numberOfDependents: number;
  employeeSignature: string;
  signatureDate: string;
  
  // Page 7 - ICT Terms
  acceptsICTTerms: boolean;
  
  // Page 8 - Induction
  orientationCompleted: boolean;
  introductionToTeam: boolean;
  otherOrientation: string;
  
  // Page 9 - Office Use
  laptopIssued: boolean;
  laptopBrand: string;
  mobileIssued: boolean;
  mobileDetails: string;
  emailIssued: boolean;
  hrisAccess: boolean;
  basicSalary: string;
  allowances: string;

  // Additional fields for display in StaffManagementModule.tsx
  id: string; // The original EmployeeData interface had this.
  joinedDate: string; // The original EmployeeData interface had this.
  status: 'Active' | 'Inactive'; // The original EmployeeData interface had this.
}

const StaffManagementModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState("leave-requests");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [performanceRecords, setPerformanceRecords] = useState<PerformanceRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [evaluationForms, setEvaluationForms] = useState<EvaluationForm[]>([]);
  const [filteredLeaveRequests, setFilteredLeaveRequests] = useState<LeaveRequest[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeData[]>([]);
  const [filteredPerformance, setFilteredPerformance] = useState<PerformanceRecord[]>([]);
  const [filteredAttendance, setFilteredAttendance] = useState<AttendanceRecord[]>([]);
  const [filteredSalaries, setFilteredSalaries] = useState<SalaryRecord[]>([]);
  const [filteredTraining, setFilteredTraining] = useState<TrainingRecord[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<EvaluationForm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isJoiningModalOpen, setIsJoiningModalOpen] = useState(false);
  const [joiningStep, setJoiningStep] = useState(0);
  const [loading, setLoading] = useState(true); // Added loading state

  // New leave request form state
  const [newLeaveRequest, setNewLeaveRequest] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    designation: '',
    leaveType: 'Annual' as const,
    startDate: '',
    endDate: '',
    reason: '',
    workHandoverTo: '',
    alternateContact: ''
  });

  // New employee form state
  const [newEmployee, setNewEmployee] = useState<EmployeeData>({
    // Initialize with empty/default values
    employeeName: '',
    designation: '',
    department: '',
    workStation: 'Drainage, Road, Footpath and Road Furniture Works – Tilottama Municipality',
    gender: '',
    nationality: '',
    permanentAddress: '',
    temporaryAddress: '',
    dateOfBirth: '',
    maritalStatus: '',
    bloodGroup: '',
    religion: '',
    personalMobile: '',
    emailAddress: '',
    emergencyContactPerson: '',
    emergencyContactNumber: '',
    qualifications: [],
    workExperience: [],
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    panNumber: '',
    nationalId: '',
    pfNumber: '',
    pfBranch: '',
    citNumber: '',
    citBranch: '',
    retirementAccount: '',
    retirementBank: '',
    ssfNumber: '',
    citizenshipDocument: 'citizenship',
    citizenshipIssueDistrict: '',
    citizenshipIssueOffice: '',
    citizenshipIssueDate: '',
    citizenshipNumber: '',
    drivingLicenseDate: '',
    drivingLicenseNumber: '',
    drivingLicenseCategory: '',
    vehicleType: '',
    vehicleNumber: '',
    previousEmployerLetter: false,
    nomineeName: '',
    nomineeRelation: '',
    nomineeContact: '',
    nomineePermanentAddress: '',
    nomineeTemporaryAddress: '',
    nomineeDocument: 'citizenship',
    nomineeIssueDistrict: '',
    nomineeIssueOffice: '',
    nomineeIssueDate: '',
    nomineeNumber: '',
    isSingle: false,
    isMarried: false,
    numberOfSons: 0,
    numberOfDaughters: 0,
    numberOfDependents: 0,
    employeeSignature: '',
    signatureDate: '',
    acceptsICTTerms: false,
    orientationCompleted: false,
    introductionToTeam: false,
    otherOrientation: '',
    laptopIssued: false,
    laptopBrand: '',
    mobileIssued: false,
    mobileDetails: '',
    emailIssued: false,
    hrisAccess: false,
    basicSalary: '',
    allowances: '',
    // Add these back for the combined EmployeeData
    id: '',
    joinedDate: '',
    status: 'Active'
  });

  const joiningSteps = [
    'Basic Information',
    'Education',
    'Work Experience',
    'Banking Details',
    'Nominee Info',
    'Declarations',
    'ICT Terms',
    'Induction',
    'Office Setup'
  ];

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load all staff categories from MongoDB
        const categories = [
          { key: 'leave-requests', setter: setLeaveRequests, filteredSetter: setFilteredLeaveRequests },
          { key: 'employees', setter: setEmployees, filteredSetter: setFilteredEmployees },
          { key: 'performance', setter: setPerformanceRecords, filteredSetter: setFilteredPerformance },
          { key: 'attendance', setter: setAttendanceRecords, filteredSetter: setFilteredAttendance },
          { key: 'salaries', setter: setSalaryRecords, filteredSetter: setFilteredSalaries },
          { key: 'training', setter: setTrainingRecords, filteredSetter: setFilteredTraining },
          { key: 'evaluations', setter: setEvaluationForms, filteredSetter: setFilteredEvaluations }
        ];

        for (const cat of categories) {
          try {
            const data = await apiService.getStaffData(cat.key);
            cat.setter(data);
            cat.filteredSetter(data);
            
            // Sync to offlineStorage for offline availability
            await offlineStorage.setItem(`staff-${cat.key}`, data);
          } catch (error) {
            console.warn(`API failed for ${cat.key}, falling back to offlineStorage:`, error);
            const offlineData = await offlineStorage.getItem<any[]>(`staff-${cat.key}`);
            if (offlineData) {
              cat.setter(offlineData);
              cat.filteredSetter(offlineData);
            }
          }
        }
      } catch (error) {
        console.error('Error loading staff data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter data
  useEffect(() => {
    if (activeTab === "leave-requests") {
      let filtered = [...leaveRequests];
      if (searchTerm) {
        filtered = filtered.filter(request => 
          request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      if (statusFilter !== 'All') {
        filtered = filtered.filter(request => request.status === statusFilter);
      }
      setFilteredLeaveRequests(filtered);
    } else if (activeTab === "employees") {
      let filtered = [...employees];
      if (searchTerm) {
        filtered = filtered.filter(emp => 
          emp.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.department.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      setFilteredEmployees(filtered);
    } else if (activeTab === "performance") {
      let filtered = [...performanceRecords];
      if (searchTerm) {
        filtered = filtered.filter(record => 
          record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.period.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      setFilteredPerformance(filtered);
    } else if (activeTab === "attendance") {
      let filtered = [...attendanceRecords];
      if (searchTerm) {
        filtered = filtered.filter(record => 
          record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.date.includes(searchTerm)
        );
      }
      if (statusFilter !== 'All') {
        filtered = filtered.filter(record => record.status === statusFilter);
      }
      setFilteredAttendance(filtered);
    } else if (activeTab === "salary") {
      let filtered = [...salaryRecords];
      if (searchTerm) {
        filtered = filtered.filter(record => 
          record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.payPeriod.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      if (statusFilter !== 'All') {
        filtered = filtered.filter(record => record.status === statusFilter);
      }
      setFilteredSalaries(filtered);
    } else if (activeTab === "training") {
      let filtered = [...trainingRecords];
      if (searchTerm) {
        filtered = filtered.filter(record => 
          record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.courseName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      if (statusFilter !== 'All') {
        filtered = filtered.filter(record => record.status === statusFilter);
      }
setFilteredTraining(filtered);
    } else if (activeTab === "evaluations") {
      let filtered = [...evaluationForms];
      if (searchTerm) {
        filtered = filtered.filter(form => 
          form.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          form.evaluator.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      if (statusFilter !== 'All') {
        filtered = filtered.filter(form => form.status === statusFilter);
      }
      setFilteredEvaluations(filtered);
    }
  }, [leaveRequests, employees, performanceRecords, attendanceRecords, salaryRecords, trainingRecords, evaluationForms, searchTerm, statusFilter, activeTab]);

  const leaveRequestsPagination = usePagination(filteredLeaveRequests, 10);
  const employeesPagination = usePagination(filteredEmployees, 9); // Grid of 3, so 9 makes sense
  const performancePagination = usePagination(filteredPerformance, 10);
  const attendancePagination = usePagination(filteredAttendance, 10);
  const salariesPagination = usePagination(filteredSalaries, 10);
  const trainingPagination = usePagination(filteredTraining, 10);
  const evaluationsPagination = usePagination(filteredEvaluations, 10);

  // Leave request handlers
  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newLeaveRequest.employeeId || !newLeaveRequest.employeeName) {
      alert('Employee ID and Name are required');
      return;
    }
    
    if (!newLeaveRequest.startDate || !newLeaveRequest.endDate) {
      alert('Start date and End date are required');
      return;
    }
    
    const startDate = new Date(newLeaveRequest.startDate);
    const endDate = new Date(newLeaveRequest.endDate);
    
    // Duplicate/Overlap Check
    const isOverlapping = leaveRequests.some(r => 
        r.employeeId === newLeaveRequest.employeeId && 
        ((startDate >= new Date(r.startDate) && startDate <= new Date(r.endDate)) || 
         (endDate >= new Date(r.startDate) && endDate <= new Date(r.endDate)))
    );

    if (isOverlapping) {
        alert('An overlapping leave request already exists for this employee.');
        return;
    }
    
    if (startDate > endDate) {
      alert('Start date cannot be after end date');
      return;
    }
    
    const numberOfDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    try {
      const leaveRequest: LeaveRequest = {
        id: `leave-${Date.now()}`,
        ...newLeaveRequest,
        numberOfDays,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Try to save to API (MongoDB) first
      try {
        const savedRequest = await apiService.saveStaffData('leave-requests', leaveRequest);
        const updatedRequests = [...leaveRequests, savedRequest || leaveRequest];
        setLeaveRequests(updatedRequests);
        // Sync to offlineStorage
        await offlineStorage.setItem('staff-leave-requests', updatedRequests);
      } catch (error) {
        console.warn('API save failed for leave request, falling back to offlineStorage:', error);
        const updatedRequests = [...leaveRequests, leaveRequest];
        setLeaveRequests(updatedRequests);
        await offlineStorage.setItem('staff-leave-requests', updatedRequests);
      }
      
      // Reset form
      setNewLeaveRequest({
        employeeId: '',
        employeeName: '',
        department: '',
        designation: '',
        leaveType: 'Annual',
        startDate: '',
        endDate: '',
        reason: '',
        workHandoverTo: '',
        alternateContact: ''
      });
      
      setIsLeaveModalOpen(false);
      alert('Leave request submitted successfully');
    } catch (error) {
      alert('Failed to submit leave request');
    }
  };

  const updateLeaveStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      // Find the request to update
      const requestToUpdate = leaveRequests.find(r => r.id === id);
      if (!requestToUpdate) return;

      const updatedData = { ...requestToUpdate, status, updatedAt: new Date().toISOString() };
      
      // Try API update (MongoDB)
      try {
        await apiService.saveStaffData('leave-requests', updatedData);
        const updatedRequests = leaveRequests.map(r => r.id === id ? updatedData : r);
        setLeaveRequests(updatedRequests);
        await offlineStorage.setItem('staff-leave-requests', updatedRequests);
      } catch (error) {
        console.warn('API update failed for leave request, falling back to offlineStorage:', error);
        const updatedRequests = leaveRequests.map(r => r.id === id ? updatedData : r);
        setLeaveRequests(updatedRequests);
        await offlineStorage.setItem('staff-leave-requests', updatedRequests);
      }
      
      alert(`Leave request ${status.toLowerCase()} successfully`);
    } catch (error) {
      alert(`Failed to ${status.toLowerCase()} leave request`);
    }
  };

  const handleInputChange = (field: keyof EmployeeData, value: any) => {
    setNewEmployee(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Employee joining handlers
  const handleNextJoiningStep = () => {
    if (joiningStep < joiningSteps.length - 1) {
      setJoiningStep(joiningStep + 1);
    }
  };

  const handleBackJoiningStep = () => {
    if (joiningStep > 0) {
      setJoiningStep(joiningStep - 1);
    }
  };

  const handleSubmitEmployee = async () => {
    // Duplicate Check
    if (employees.some(e => e.emailAddress.toLowerCase() === newEmployee.emailAddress.toLowerCase())) {
        alert('An employee with this email address already exists.');
        return;
    }

    try {
      const employee: EmployeeData = {
        ...newEmployee,
        id: `emp-${Date.now()}`,
        joinedDate: new Date().toISOString(),
        status: 'Active'
      };
      
      // Try API save (MongoDB)
      try {
        const savedEmployee = await apiService.saveStaffData('employees', employee);
        const updatedEmployees = [...employees, savedEmployee || employee];
        setEmployees(updatedEmployees);
        await offlineStorage.setItem('staff-employees', updatedEmployees);
      } catch (error) {
        console.warn('API save failed for employee, falling back to offlineStorage:', error);
        const updatedEmployees = [...employees, employee];
        setEmployees(updatedEmployees);
        await offlineStorage.setItem('staff-employees', updatedEmployees);
      }
      
      // Reset form
      setNewEmployee({
        employeeName: '',
        designation: '',
        department: '',
        workStation: 'Drainage, Road, Footpath and Road Furniture Works – Tilottama Municipality',
        gender: '',
        nationality: '',
        permanentAddress: '',
        temporaryAddress: '',
        dateOfBirth: '',
        maritalStatus: '',
        bloodGroup: '',
        religion: '',
        personalMobile: '',
        emailAddress: '',
        emergencyContactPerson: '',
        emergencyContactNumber: '',
        qualifications: [],
        workExperience: [],
        bankAccountName: '',
        bankAccountNumber: '',
        bankName: '',
        panNumber: '',
        nationalId: '',
        pfNumber: '',
        pfBranch: '',
        citNumber: '',
        citBranch: '',
        retirementAccount: '',
        retirementBank: '',
        ssfNumber: '',
        citizenshipDocument: 'citizenship',
        citizenshipIssueDistrict: '',
        citizenshipIssueOffice: '',
        citizenshipIssueDate: '',
        citizenshipNumber: '',
        drivingLicenseDate: '',
        drivingLicenseNumber: '',
        drivingLicenseCategory: '',
        vehicleType: '',
        vehicleNumber: '',
        previousEmployerLetter: false,
        nomineeName: '',
        nomineeRelation: '',
        nomineeContact: '',
        nomineePermanentAddress: '',
        nomineeTemporaryAddress: '',
        nomineeDocument: 'citizenship',
        nomineeIssueDistrict: '',
        nomineeIssueOffice: '',
        nomineeIssueDate: '',
        nomineeNumber: '',
        isSingle: false,
        isMarried: false,
        numberOfSons: 0,
        numberOfDaughters: 0,
        numberOfDependents: 0,
        employeeSignature: '',
        signatureDate: '',
        acceptsICTTerms: false,
        orientationCompleted: false,
        introductionToTeam: false,
        otherOrientation: '',
        laptopIssued: false,
        laptopBrand: '',
        mobileIssued: false,
        mobileDetails: '',
        emailIssued: false,
        hrisAccess: false,
        basicSalary: '',
        allowances: '',
        id: '',
        joinedDate: '',
        status: 'Active'
      });
      
      setJoiningStep(0);
      setIsJoiningModalOpen(false);
      alert('Employee onboarded successfully');
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Failed to save employee data. Please try again.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle size={16} />;
      case 'Rejected': return <XCircle size={16} />;
      case 'Pending': return <Clock size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const renderStepContent = () => {
    switch (joiningStep) { // Changed activeStep to joiningStep
      case 0: // Basic Information
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-full">
              <h6 className="text-lg font-bold">Basic Information</h6>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeName">Employee Name <span className="text-red-500">*</span></Label>
              <Input
                id="employeeName"
                required
                value={newEmployee.employeeName}
                onChange={(e) => handleInputChange('employeeName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={newEmployee.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={newEmployee.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workStation">Work Station/Location</Label>
              <textarea
                id="workStation"
                title="Work Station/Location"
                placeholder="Enter work station or location details"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newEmployee.workStation}
                onChange={(e) => handleInputChange('workStation', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={newEmployee.gender}
                onValueChange={(val) => handleInputChange('gender', val)}
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={newEmployee.nationality}
                onChange={(e) => handleInputChange('nationality', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={newEmployee.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maritalStatus">Marital Status</Label>
              <Select
                value={newEmployee.maritalStatus}
                onValueChange={(val) => handleInputChange('maritalStatus', val)}
              >
                <SelectTrigger id="maritalStatus">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                  <SelectItem value="Divorced">Divorced</SelectItem>
                  <SelectItem value="Widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Input
                id="bloodGroup"
                value={newEmployee.bloodGroup}
                onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="religion">Religion</Label>
              <Input
                id="religion"
                value={newEmployee.religion}
                onChange={(e) => handleInputChange('religion', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personalMobile">Personal Mobile Number</Label>
              <Input
                id="personalMobile"
                value={newEmployee.personalMobile}
                placeholder="e.g. +977 9800000000"
                onChange={(e) => handleInputChange('personalMobile', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailAddress">Email Address</Label>
              <Input
                id="emailAddress"
                type="email"
                value={newEmployee.emailAddress}
                onChange={(e) => handleInputChange('emailAddress', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactPerson">Emergency Contact Person</Label>
              <Input
                id="emergencyContactPerson"
                value={newEmployee.emergencyContactPerson}
                onChange={(e) => handleInputChange('emergencyContactPerson', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactNumber">Emergency Contact Number</Label>
              <Input
                id="emergencyContactNumber"
                value={newEmployee.emergencyContactNumber}
                onChange={(e) => handleInputChange('emergencyContactNumber', e.target.value)}
              />
            </div>
            <div className="col-span-full space-y-2">
              <Label htmlFor="permanentAddress">Permanent Address</Label>
              <textarea
                id="permanentAddress"
                title="Permanent Address"
                placeholder="Enter permanent address"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newEmployee.permanentAddress}
                onChange={(e) => handleInputChange('permanentAddress', e.target.value)}
              />
            </div>
            <div className="col-span-full space-y-2">
              <Label htmlFor="temporaryAddress">Temporary Address</Label>
              <textarea
                id="temporaryAddress"
                title="Temporary Address"
                placeholder="Enter temporary address"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newEmployee.temporaryAddress}
                onChange={(e) => handleInputChange('temporaryAddress', e.target.value)}
              />
            </div>
          </div>
        );


      case 1: // Educational Qualifications
        return (
          <div className="space-y-4">
            <h6 className="text-lg font-bold">Educational Qualifications</h6>
            <p className="text-sm text-muted-foreground">
              Add educational qualifications in chronological order (highest qualification first)
            </p>
            <div className="text-center py-10 text-muted-foreground">
              Education qualification form fields would be implemented here
            </div>
          </div>
        );

      case 2: // Work Experience
        return (
          <div className="space-y-4">
            <h6 className="text-lg font-bold">Work Experience Summary</h6>
            <p className="text-sm text-muted-foreground">
              List previous work experience starting with the most recent
            </p>
            <div className="text-center py-10 text-muted-foreground">
              Work experience form fields would be implemented here
            </div>
          </div>
        );

      case 3: // Banking Information
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-full">
              <h6 className="text-lg font-bold">Banking Information</h6>
              <p className="text-sm text-muted-foreground mb-2">
                Please provide accurate banking details for salary processing
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountName">Bank Account Name</Label>
              <Input
                id="bankAccountName"
                value={newEmployee.bankAccountName}
                onChange={(e) => handleInputChange('bankAccountName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
              <Input
                id="bankAccountNumber"
                value={newEmployee.bankAccountNumber}
                placeholder="e.g. 001001000123"
                onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={newEmployee.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                value={newEmployee.panNumber}
                placeholder="e.g. 123-456-789"
                onChange={(e) => handleInputChange('panNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationalId">National ID No</Label>
              <Input
                id="nationalId"
                value={newEmployee.nationalId}
                onChange={(e) => handleInputChange('nationalId', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pfNumber">Provident Fund (PF) Number</Label>
              <Input
                id="pfNumber"
                value={newEmployee.pfNumber}
                onChange={(e) => handleInputChange('pfNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pfBranch">PF Contribution Branch</Label>
              <Input
                id="pfBranch"
                value={newEmployee.pfBranch}
                onChange={(e) => handleInputChange('pfBranch', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="citNumber">CIT Number</Label>
              <Input
                id="citNumber"
                value={newEmployee.citNumber}
                onChange={(e) => handleInputChange('citNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="citBranch">CIT Contribution Branch</Label>
              <Input
                id="citBranch"
                value={newEmployee.citBranch}
                onChange={(e) => handleInputChange('citBranch', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retirementAccount">Retirement Account Number</Label>
              <Input
                id="retirementAccount"
                value={newEmployee.retirementAccount}
                onChange={(e) => handleInputChange('retirementAccount', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retirementBank">Retirement Fund Bank</Label>
              <Input
                id="retirementBank"
                value={newEmployee.retirementBank}
                onChange={(e) => handleInputChange('retirementBank', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ssfNumber">SSF Number</Label>
              <Input
                id="ssfNumber"
                value={newEmployee.ssfNumber}
                onChange={(e) => handleInputChange('ssfNumber', e.target.value)}
              />
            </div>
          </div>
        );

      case 4: // Nominee Information
        return (
          <div className="space-y-4">
            <h6 className="text-lg font-bold">Nominee Information</h6>
            <p className="text-sm text-muted-foreground">
              Please provide details of your nominee for emergency purposes
            </p>
            <div className="text-center py-10 text-muted-foreground">
              Nominee information form fields would be implemented here
            </div>
          </div>
        );

      case 5: // Declarations
        return (
          <div className="space-y-4">
            <h6 className="text-lg font-bold">Couple Declaration</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numberOfSons">Number of Sons</Label>
                <Input
                  id="numberOfSons"
                  type="number"
                  value={newEmployee.numberOfSons}
                  onChange={(e) => handleInputChange('numberOfSons', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfDaughters">Number of Daughters</Label>
                <Input
                  id="numberOfDaughters"
                  type="number"
                  value={newEmployee.numberOfDaughters}
                  onChange={(e) => handleInputChange('numberOfDaughters', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfDependents">Number of Dependents</Label>
                <Input
                  id="numberOfDependents"
                  type="number"
                  value={newEmployee.numberOfDependents}
                  onChange={(e) => handleInputChange('numberOfDependents', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-full space-y-2">
                <Label htmlFor="employeeSignature">Employee Signature</Label>
                <Input
                  id="employeeSignature"
                  placeholder="Digital signature or name for signature"
                  value={newEmployee.employeeSignature}
                  onChange={(e) => handleInputChange('employeeSignature', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signatureDate">Date (DD/MM/YYYY)</Label>
                <Input
                  id="signatureDate"
                  value={newEmployee.signatureDate}
                  onChange={(e) => handleInputChange('signatureDate', e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 6: // ICT Terms
        return (
          <div className="space-y-4">
            <h6 className="text-lg font-bold">ICT Services Terms and Conditions</h6>
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <p className="text-sm mb-4">
                These terms form a legal agreement between you and the Company. You must accept all principles and regulations in the Company's acceptable use policies to access and use its ICT facilities and services.
              </p>
              <p className="text-sm mb-4">
                TUNDI provides computing and ICT resources, including email, for official use to support the Company's objectives and administration. These facilities cannot be used for external projects or non-approved activities.
              </p>
              <p className="text-sm mb-4">
                TUNDI reserves the right to monitor any data, including personal email and instant messages, sent, received, or accessed within office premises as needed.
              </p>
            </ScrollArea>
            <div className="pt-2">
              <Button
                variant={newEmployee.acceptsICTTerms ? "default" : "outline"}
                onClick={() => handleInputChange('acceptsICTTerms', !newEmployee.acceptsICTTerms)}
                className="w-full"
              >
                {newEmployee.acceptsICTTerms ? 'Terms Accepted ✓' : 'Accept ICT Terms and Conditions'}
              </Button>
            </div>
          </div>
        );

      case 7: // Induction
        return (
          <div className="space-y-4">
            <h6 className="text-lg font-bold">Induction/Orientation Checklist</h6>
            <div className="grid grid-cols-1 gap-4">
              <Button
                variant={newEmployee.orientationCompleted ? "default" : "outline"}
                onClick={() => handleInputChange('orientationCompleted', !newEmployee.orientationCompleted)}
                className="w-full justify-start py-6 h-auto whitespace-normal text-left"
              >
                <div className="flex items-center gap-2">
                   {newEmployee.orientationCompleted && <span>✓</span>}
                   <span>Briefing about Organization, Office Rules/Regulation</span>
                </div>
              </Button>
              
              <Button
                variant={newEmployee.introductionToTeam ? "default" : "outline"}
                onClick={() => handleInputChange('introductionToTeam', !newEmployee.introductionToTeam)}
                className="w-full justify-start py-6 h-auto whitespace-normal text-left"
              >
                <div className="flex items-center gap-2">
                   {newEmployee.introductionToTeam && <span>✓</span>}
                   <span>Introduction with Department Head & Team members</span>
                </div>
              </Button>

              <div className="space-y-2">
                <Label htmlFor="other-orientation">Other Orientation Activities</Label>
                <textarea
                  id="other-orientation"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Specify other activities..."
                  value={newEmployee.otherOrientation}
                  onChange={(e) => handleInputChange('otherOrientation', e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 8: // Office Setup
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-full">
              <h6 className="text-lg font-bold">Office Assets and Setup</h6>
            </div>
            
            <div className="space-y-3">
              <Button
                variant={newEmployee.laptopIssued ? "default" : "outline"}
                onClick={() => handleInputChange('laptopIssued', !newEmployee.laptopIssued)}
                className="w-full py-6 h-auto"
              >
                {newEmployee.laptopIssued ? 'Laptop Issued ✓' : 'Issue Laptop'}
              </Button>
              {newEmployee.laptopIssued && (
                <div className="space-y-2">
                  <Label htmlFor="laptop-brand">Laptop Brand Name</Label>
                  <Input
                    id="laptop-brand"
                    placeholder="Enter brand name"
                    value={newEmployee.laptopBrand}
                    onChange={(e) => handleInputChange('laptopBrand', e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                variant={newEmployee.mobileIssued ? "default" : "outline"}
                onClick={() => handleInputChange('mobileIssued', !newEmployee.mobileIssued)}
                className="w-full py-6 h-auto"
              >
                {newEmployee.mobileIssued ? 'Mobile Issued ✓' : 'Issue Mobile'}
              </Button>
              {newEmployee.mobileIssued && (
                <div className="space-y-2">
                  <Label htmlFor="mobile-details">Mobile Details & SIM Number</Label>
                  <Input
                    id="mobile-details"
                    placeholder="Enter details"
                    value={newEmployee.mobileDetails}
                    onChange={(e) => handleInputChange('mobileDetails', e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Button
                variant={newEmployee.emailIssued ? "default" : "outline"}
                onClick={() => handleInputChange('emailIssued', !newEmployee.emailIssued)}
                className="w-full py-6 h-auto"
              >
                {newEmployee.emailIssued ? 'Official Email Issued ✓' : 'Issue Official Email'}
              </Button>
            </div>
            <div className="space-y-3">
              <Button
                variant={newEmployee.hrisAccess ? "default" : "outline"}
                onClick={() => handleInputChange('hrisAccess', !newEmployee.hrisAccess)}
                className="w-full py-6 h-auto"
              >
                {newEmployee.hrisAccess ? 'HRIS Access Granted ✓' : 'Grant HRIS Access'}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseSalary">Basic Salary</Label>
              <Input
                id="baseSalary"
                value={newEmployee.basicSalary}
                onChange={(e) => handleInputChange('basicSalary', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowances">Allowances</Label>
              <Input
                id="allowances"
                value={newEmployee.allowances}
                onChange={(e) => handleInputChange('allowances', e.target.value)}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] overflow-y-auto p-4">
      <div className="flex justify-between mb-6 items-center">
        <div>
          <h5 className="text-2xl font-black">Staff Management</h5>
          <p className="text-sm text-muted-foreground">
            Manage employee leave requests and onboarding
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsLeaveModalOpen(true)}
          >
            <FileText className="mr-2 h-4 w-4" />
            New Leave Request
          </Button>
          <Button 
            onClick={() => setIsJoiningModalOpen(true)}
          >
            <User className="mr-2 h-4 w-4" />
            New Employee
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-background rounded-xl border border-border shadow-sm">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-12 p-0 overflow-x-auto overflow-y-hidden scrollbar-hide">
          <TabsTrigger value="leave-requests" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12">
            <Calendar className="mr-2 h-4 w-4" /> Leave Requests ({leaveRequests.length})
          </TabsTrigger>
          <TabsTrigger value="employees" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12">
            <Users className="mr-2 h-4 w-4" /> Employees ({employees.length})
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12">
            <span className="mr-2">📊</span> Performance ({performanceRecords.length})
          </TabsTrigger>
          <TabsTrigger value="attendance" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12">
            <Clock className="mr-2 h-4 w-4" /> Attendance ({attendanceRecords.length})
          </TabsTrigger>
          <TabsTrigger value="salary" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12">
            <span className="mr-2">💰</span> Salary ({salaryRecords.length})
          </TabsTrigger>
          <TabsTrigger value="training" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12">
            <span className="mr-2">🎓</span> Training ({trainingRecords.length})
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12">
            <span className="mr-2">📋</span> Evaluations ({evaluationForms.length})
          </TabsTrigger>
        </TabsList>

        <div className="p-6">
          {/* Filters */}
          <div className="p-4 mb-6 rounded-lg border border-border bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="col-span-1 md:col-span-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder={activeTab === "leave-requests" ? "Search by employee name or ID..." : "Search by employee name or department..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              {activeTab === "leave-requests" && (
                <div className="col-span-1 md:col-span-3">
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Status</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className={cn("col-span-1 flex justify-end", activeTab === "leave-requests" ? "md:col-span-3" : "md:col-span-6")}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export to PDF</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Leave Requests Tab Content */}
          <TabsContent value="leave-requests" className="m-0 border-none p-0">
            <div className="p-0">
              {loading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground font-medium">Loading leave requests...</p>
                  </div>
                </div>
              ) : (
                <>
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-primary">
                        {leaveRequests.filter(r => r.status === 'Pending').length}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pending Requests
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">
                        {leaveRequests.filter(r => r.status === 'Approved').length}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Approved
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-red-600">
                        {leaveRequests.filter(r => r.status === 'Rejected').length}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Rejected
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-600">
                        {leaveRequests.reduce((sum, r) => sum + r.numberOfDays, 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total Leave Days
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Leave Requests Table */}
                <div className="rounded-md border border-border overflow-hidden bg-background">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">Employee</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">Leave Type</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">Dates</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">Days</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRequestsPagination.paginatedData.map(request => (
                        <TableRow key={request.id} className="hover:bg-slate-50/50">
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-sm">
                                {request.employeeName}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ID: {request.employeeId} | {request.department}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {request.designation}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-medium bg-slate-50 text-[10px]">
                              {request.leaveType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Calendar size={12} className="text-muted-foreground" />
                                <span>
                                  {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground ml-4.5">
                                Applied: {new Date(request.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-sm">
                              {request.numberOfDays} days
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "font-bold text-[10px] uppercase",
                              request.status === 'Approved' ? "bg-green-100 text-green-700 hover:bg-green-100 border-none shadow-none" :
                              request.status === 'Rejected' ? "bg-red-100 text-red-700 hover:bg-red-100 border-none shadow-none" :
                              "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none shadow-none"
                            )}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(request.status)}
                                {request.status}
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {request.status === 'Pending' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-xs text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                    onClick={() => updateLeaveStatus(request.id, 'Approved')}
                                  >
                                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                                    Approve
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => updateLeaveStatus(request.id, 'Rejected')}
                                  >
                                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-xs"
                              >
                                <FileText className="mr-1.5 h-3.5 w-3.5" />
                                Details
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {filteredLeaveRequests.length === 0 && (
                  <div className="text-center text-muted-foreground py-12 bg-slate-50/30 rounded-lg border border-dashed mt-4">
                    No leave requests found
                  </div>
                )}
                {filteredLeaveRequests.length > 0 && (
                  <div className="mt-4">
                    <PaginationComponent
                      currentPage={leaveRequestsPagination.currentPage}
                      totalPages={leaveRequestsPagination.totalPages}
                      pageSize={leaveRequestsPagination.pageSize}
                      totalItems={leaveRequestsPagination.totalItems}
                      onPageChange={leaveRequestsPagination.setCurrentPage}
                      onPageSizeChange={leaveRequestsPagination.setPageSize}
                      pageSizeOptions={[10, 20, 50]}
                    />
                  </div>
                )}
              </>
            )}
            </div>
          </TabsContent>

          {/* Employees Tab Content */}
          <TabsContent value="employees" className="m-0 border-none p-0">
            <div>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-primary">
                      {employees.filter(e => e.status === 'Active').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Active Employees
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">
                      {new Set(employees.map(e => e.department)).size}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Departments
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Employees Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employeesPagination.paginatedData.map(employee => (
                  <Card key={employee.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h6 className="font-bold text-base">
                            {employee.employeeName}
                          </h6>
                          <p className="text-xs text-muted-foreground">
                            {employee.designation}
                          </p>
                        </div>
                        <Badge variant={employee.status === 'Active' ? 'default' : 'outline'} className={cn(
                          employee.status === 'Active' ? "bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-none" : ""
                        )}>
                          {employee.status}
                        </Badge>
                      </div>
                      
                      <Separator className="my-3" />
                      
                      <div className="space-y-2 mt-4 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-medium">Department:</span>
                          <span className="font-semibold text-right">{employee.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-medium">Email:</span>
                          <span className="font-semibold text-right truncate max-w-[150px]">{employee.emailAddress}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-medium">Mobile:</span>
                          <span className="font-semibold text-right">{employee.personalMobile}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="text-muted-foreground font-medium">Joined:</span>
                          <span className="font-semibold text-right">{new Date(employee.joinedDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredEmployees.length === 0 && (
                <div className="text-center text-muted-foreground py-12 bg-slate-50/30 rounded-lg border border-dashed">
                  No employees found
                </div>
              )}
              {filteredEmployees.length > 0 && (
                <div className="mt-4">
                  <PaginationComponent
                    currentPage={employeesPagination.currentPage}
                    totalPages={employeesPagination.totalPages}
                    pageSize={employeesPagination.pageSize}
                    totalItems={employeesPagination.totalItems}
                    onPageChange={employeesPagination.setCurrentPage}
                    onPageSizeChange={employeesPagination.setPageSize}
                    pageSizeOptions={[9, 18, 36]}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Performance Tab Content */}
          <TabsContent value="performance" className="m-0 border-none p-0">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h6 className="text-lg font-bold">Performance Records</h6>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Performance Review
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-primary">
                      {performanceRecords.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reviews Conducted
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {performanceRecords.length > 0 ? (performanceRecords.reduce((sum, r) => sum + r.overallRating, 0) / performanceRecords.length).toFixed(1) : '0'}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Avg Rating
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border border-border overflow-hidden bg-background">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Employee</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Period</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Overall Rating</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Reviewer</TableHead>
                      <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performancePagination.paginatedData.map(record => (
                      <TableRow key={record.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm">
                              {record.employeeName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {record.employeeId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{record.period}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "font-bold text-[10px]",
                            record.overallRating >= 80 ? "bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-none" : 
                            record.overallRating >= 60 ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 shadow-none border-none" : 
                            "bg-red-100 text-red-700 hover:bg-red-100 shadow-none border-none"
                          )}>
                            {record.overallRating}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{record.reviewer}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 text-xs">
                            <FileText className="mr-1.5 h-3.5 w-3.5" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
                </div>
              )}
              {filteredPerformance.length > 0 && (
                <div className="mt-4">
                  <PaginationComponent
                    currentPage={performancePagination.currentPage}
                    totalPages={performancePagination.totalPages}
                    pageSize={performancePagination.pageSize}
                    totalItems={performancePagination.totalItems}
                    onPageChange={performancePagination.setCurrentPage}
                    onPageSizeChange={performancePagination.setPageSize}
                    pageSizeOptions={[10, 20, 50]}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Attendance Tab Content */}
          <TabsContent value="attendance" className="m-0 border-none p-0">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h6 className="text-lg font-bold">Attendance Records</h6>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Mark Attendance
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {attendanceRecords.filter(a => a.status === 'Present').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Present Today
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">
                      {attendanceRecords.filter(a => a.status === 'Absent').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Absent Today
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-600">
                      {attendanceRecords.filter(a => a.status === 'Late').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Late Arrivals
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">
                      {attendanceRecords.reduce((sum, a) => sum + (a.hoursWorked || 0), 0).toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total Hours
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border border-border overflow-hidden bg-background">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Employee</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Date</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Hours</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Overtime</TableHead>
                      <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendancePagination.paginatedData.map(record => (
                      <TableRow key={record.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm">
                              {record.employeeName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {record.employeeId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{new Date(record.date).toLocaleDateString()}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "font-bold text-[10px] uppercase",
                            record.status === 'Present' ? "bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-none" : 
                            record.status === 'Absent' ? "bg-red-100 text-red-700 hover:bg-red-100 shadow-none border-none" : 
                            record.status === 'Late' ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 shadow-none border-none" : 
                            "bg-slate-100 text-slate-700 hover:bg-slate-100 shadow-none border-none"
                          )}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{record.hoursWorked ? `${record.hoursWorked}h` : '-'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{record.overtimeHours ? `${record.overtimeHours}h` : '-'}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 text-xs">
                            <FileText className="mr-1.5 h-3.5 w-3.5" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
                </div>
              )}
              {filteredAttendance.length > 0 && (
                <div className="mt-4">
                  <PaginationComponent
                    currentPage={attendancePagination.currentPage}
                    totalPages={attendancePagination.totalPages}
                    pageSize={attendancePagination.pageSize}
                    totalItems={attendancePagination.totalItems}
                    onPageChange={attendancePagination.setCurrentPage}
                    onPageSizeChange={attendancePagination.setPageSize}
                    pageSizeOptions={[10, 20, 50]}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Salary Tab Content */}
          <TabsContent value="salary" className="m-0 border-none p-0">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h6 className="text-lg font-bold">Salary Management</h6>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Process Salary
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(salaryRecords.reduce((sum, s) => sum + s.netSalary, 0), 'NPR')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total Payroll
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {salaryRecords.filter(s => s.status === 'Paid').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Paid Salaries
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-600">
                      {salaryRecords.filter(s => s.status === 'Pending').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pending
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">
                      {salaryRecords.filter(s => s.status === 'Overdue').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Overdue
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border border-border overflow-hidden bg-background">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Employee</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Period</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Basic Salary</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Net Salary</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Payment Date</TableHead>
                      <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salariesPagination.paginatedData.map(record => (
                      <TableRow key={record.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm">
                              {record.employeeName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {record.employeeId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{record.payPeriod}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatCurrency(record.basicSalary, 'NPR')}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-bold">{formatCurrency(record.netSalary, 'NPR')}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "font-bold text-[10px] uppercase",
                            record.status === 'Paid' ? "bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-none" : 
                            record.status === 'Pending' ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 shadow-none border-none" : 
                            "bg-red-100 text-red-700 hover:bg-red-100 shadow-none border-none"
                          )}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{new Date(record.paymentDate).toLocaleDateString()}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-8 text-xs">
                              <FileText className="mr-1.5 h-3.5 w-3.5" />
                              Payslip
                            </Button>
                            {record.status === 'Pending' && (
                              <Button variant="outline" size="sm" className="h-8 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                                Process
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
                </div>
              )}
              {filteredSalaries.length > 0 && (
                <div className="mt-4">
                  <PaginationComponent
                    currentPage={salariesPagination.currentPage}
                    totalPages={salariesPagination.totalPages}
                    pageSize={salariesPagination.pageSize}
                    totalItems={salariesPagination.totalItems}
                    onPageChange={salariesPagination.setCurrentPage}
                    onPageSizeChange={salariesPagination.setPageSize}
                    pageSizeOptions={[10, 20, 50]}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Training Tab Content */}
          <TabsContent value="training" className="m-0 border-none p-0">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h6 className="text-lg font-bold">Training Records</h6>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Training
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-primary">
                      {trainingRecords.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total Trainings
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {trainingRecords.filter(t => t.status === 'Completed').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Completed
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-600">
                      {trainingRecords.filter(t => t.status === 'In Progress').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      In Progress
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(trainingRecords.reduce((sum, t) => sum + t.cost, 0), 'NPR')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total Investment
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border border-border overflow-hidden bg-background">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Employee</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Course</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Type</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Duration</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Provider</TableHead>
                      <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainingPagination.paginatedData.map(record => (
                      <TableRow key={record.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm">
                              {record.employeeName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {record.employeeId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{record.courseName}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-bold text-[10px] bg-slate-50">
                            {record.trainingType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{record.duration} hrs</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "font-bold text-[10px] uppercase",
                            record.status === 'Completed' ? "bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-none" : 
                            record.status === 'In Progress' ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 shadow-none border-none" : 
                            record.status === 'Scheduled' ? "bg-blue-100 text-blue-700 hover:bg-blue-100 shadow-none border-none" :
                            "bg-slate-100 text-slate-700 hover:bg-slate-100 shadow-none border-none"
                          )}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{record.provider}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 text-xs">
                            <FileText className="mr-1.5 h-3.5 w-3.5" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
                </div>
              )}
              {filteredTraining.length > 0 && (
                <div className="mt-4">
                  <PaginationComponent
                    currentPage={trainingPagination.currentPage}
                    totalPages={trainingPagination.totalPages}
                    pageSize={trainingPagination.pageSize}
                    totalItems={trainingPagination.totalItems}
                    onPageChange={trainingPagination.setCurrentPage}
                    onPageSizeChange={trainingPagination.setPageSize}
                    pageSizeOptions={[10, 20, 50]}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Evaluations Tab Content */}
          <TabsContent value="evaluations" className="m-0 border-none p-0">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h6 className="text-lg font-bold">Employee Evaluations</h6>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Evaluation
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-primary">
                      {evaluationForms.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total Evaluations
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {evaluationForms.filter(e => e.status === 'Approved').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Approved
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-600">
                      {evaluationForms.filter(e => e.status === 'Submitted').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pending Review
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">
                      {evaluationForms.reduce((sum, e) => sum + e.overallRating, 0) / evaluationForms.length || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Avg Rating
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border border-border overflow-hidden bg-background">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Employee</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Evaluator</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Period</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Rating</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Next Review</TableHead>
                      <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluationsPagination.paginatedData.map(form => (
                      <TableRow key={form.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm">
                              {form.employeeName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {form.employeeId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{form.evaluator}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{form.period}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "font-bold text-[10px]",
                            form.overallRating >= 80 ? "bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-none" : 
                            form.overallRating >= 60 ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 shadow-none border-none" : 
                            "bg-red-100 text-red-700 hover:bg-red-100 shadow-none border-none"
                          )}>
                            {form.overallRating}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "font-bold text-[10px] uppercase",
                            form.status === 'Approved' ? "bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-none" : 
                            form.status === 'Submitted' ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 shadow-none border-none" : 
                            "bg-slate-100 text-slate-700 hover:bg-slate-100 shadow-none border-none"
                          )}>
                            {form.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{new Date(form.nextReviewDate).toLocaleDateString()}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-8 text-xs">
                              <FileText className="mr-1.5 h-3.5 w-3.5" />
                              View Form
                            </Button>
                            {form.status === 'Submitted' && (
                              <Button variant="outline" size="sm" className="h-8 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                                Approve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
                </div>
              )}
              {filteredEvaluations.length > 0 && (
                <div className="mt-4">
                  <PaginationComponent
                    currentPage={evaluationsPagination.currentPage}
                    totalPages={evaluationsPagination.totalPages}
                    pageSize={evaluationsPagination.pageSize}
                    totalItems={evaluationsPagination.totalItems}
                    onPageChange={evaluationsPagination.setCurrentPage}
                    onPageSizeChange={evaluationsPagination.setPageSize}
                    pageSizeOptions={[10, 20, 50]}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* New Leave Request Modal */}
      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Submit Leave Request
            </DialogTitle>
            <DialogDescription>
              Fill in the details below to request time off.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="leave-emp-id">Employee ID <span className="text-red-500">*</span></Label>
              <Input
                id="leave-emp-id"
                required
                value={newLeaveRequest.employeeId}
                onChange={(e) => setNewLeaveRequest({...newLeaveRequest, employeeId: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-emp-name">Employee Name <span className="text-red-500">*</span></Label>
              <Input
                id="leave-emp-name"
                required
                value={newLeaveRequest.employeeName}
                onChange={(e) => setNewLeaveRequest({...newLeaveRequest, employeeName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-dept">Department</Label>
              <Input
                id="leave-dept"
                value={newLeaveRequest.department}
                onChange={(e) => setNewLeaveRequest({...newLeaveRequest, department: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-desig">Designation</Label>
              <Input
                id="leave-desig"
                value={newLeaveRequest.designation}
                onChange={(e) => setNewLeaveRequest({...newLeaveRequest, designation: e.target.value})}
              />
            </div>
            <div className="col-span-full space-y-2">
              <Label htmlFor="leave-type">Leave Type</Label>
              <Select
                value={newLeaveRequest.leaveType}
                onValueChange={(val) => setNewLeaveRequest({...newLeaveRequest, leaveType: val as any})}
              >
                <SelectTrigger id="leave-type">
                  <SelectValue placeholder="Select Leave Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual">Annual Leave</SelectItem>
                  <SelectItem value="Sick">Sick Leave</SelectItem>
                  <SelectItem value="Home">Home Leave</SelectItem>
                  <SelectItem value="Maternity/Paternity/Parental">Maternity/Paternity/Parental Leave</SelectItem>
                  <SelectItem value="Bereavement">Bereavement Leave</SelectItem>
                  <SelectItem value="Other">Other Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-start">Start Date <span className="text-red-500">*</span></Label>
              <Input
                id="leave-start"
                type="date"
                required
                value={newLeaveRequest.startDate}
                onChange={(e) => setNewLeaveRequest({...newLeaveRequest, startDate: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-end">End Date <span className="text-red-500">*</span></Label>
              <Input
                id="leave-end"
                type="date"
                required
                value={newLeaveRequest.endDate}
                onChange={(e) => setNewLeaveRequest({...newLeaveRequest, endDate: e.target.value})}
              />
            </div>
            <div className="col-span-full space-y-2">
              <Label htmlFor="leave-reason">Reason for Leave <span className="text-red-500">*</span></Label>
              <textarea
                id="leave-reason"
                title="Reason for Leave"
                placeholder="Describe the reason for your leave request"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                value={newLeaveRequest.reason}
                onChange={(e) => setNewLeaveRequest({...newLeaveRequest, reason: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-handover">Work Handover To</Label>
              <Input
                id="leave-handover"
                placeholder="Person name"
                value={newLeaveRequest.workHandoverTo}
                onChange={(e) => setNewLeaveRequest({...newLeaveRequest, workHandoverTo: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-contact">Alternate Contact Number</Label>
              <Input
                id="leave-contact"
                value={newLeaveRequest.alternateContact}
                onChange={(e) => setNewLeaveRequest({...newLeaveRequest, alternateContact: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter className="bg-slate-50/50 p-4 -mx-6 -mb-6 rounded-b-lg">
            <Button variant="outline" onClick={() => setIsLeaveModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitLeaveRequest}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Employee Modal */}
      <Dialog open={isJoiningModalOpen} onOpenChange={setIsJoiningModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Employee Onboarding</DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-between mb-8 overflow-x-auto pb-2 px-1">
            {joiningSteps.map((label, index) => (
              <div key={label} className="flex flex-col items-center gap-1.5 min-w-[80px]">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  joiningStep === index ? "bg-primary text-primary-foreground" : 
                  joiningStep > index ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"
                )}>
                  {joiningStep > index ? "✓" : index + 1}
                </div>
                <span className={cn(
                  "text-[10px] text-center font-medium max-w-[70px] leading-tight",
                  joiningStep === index ? "text-primary" : "text-slate-500"
                )}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <Separator className="mb-6" />

          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          <Separator className="my-6" />

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBackJoiningStep}
              disabled={joiningStep === 0}
            >
              ← Back
            </Button>
            
            {joiningStep === joiningSteps.length - 1 ? (
              <Button
                onClick={handleSubmitEmployee}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="mr-2 h-4 w-4" />
                Submit Form
              </Button>
            ) : (
              <Button
                onClick={handleNextJoiningStep}
              >
                Next →
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagementModule;
