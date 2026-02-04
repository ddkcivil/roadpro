import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Tabs, 
  Tab, 
  Grid, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions
} from '@mui/material';
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
  Upload
} from 'lucide-react';
import { apiService } from '../../services/api/apiService';
import { LocalStorageUtils } from '../../utils/data/localStorageUtils';

// Types
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
  const [activeTab, setActiveTab] = useState(0);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [filteredLeaveRequests, setFilteredLeaveRequests] = useState<LeaveRequest[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeData[]>([]);
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
        // Load leave requests
        let requests: LeaveRequest[] = [];
        try {
          const apiRequests = await apiService.getLeaveRequests();
          requests = apiRequests;
        } catch (error) {
          console.warn('API for leave requests failed, falling back to localStorage:', error);
          const localStorageRequests = localStorage.getItem('staff-leave-requests');
          requests = localStorageRequests ? JSON.parse(localStorageRequests) : [];
        }
        setLeaveRequests(requests);
        setFilteredLeaveRequests(requests);

        // Load employees
                  const empData = localStorage.getItem('staff-employees');        const employeesData = empData ? JSON.parse(empData) : [];
        setEmployees(employeesData);
        setFilteredEmployees(employeesData);
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
    if (activeTab === 0) {
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
    } else {
      let filtered = [...employees];
      if (searchTerm) {
        filtered = filtered.filter(emp => 
          emp.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.department.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      setFilteredEmployees(filtered);
    }
  }, [leaveRequests, employees, searchTerm, statusFilter, activeTab]);

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
      
      // Save to localStorage
      const updatedRequests = [...leaveRequests, leaveRequest];
      LocalStorageUtils.setItem('staff-leave-requests', JSON.stringify(updatedRequests));
      setLeaveRequests(updatedRequests);
      
      // Try to save to API
      try {
        await apiService.createLeaveRequest(leaveRequest);
      } catch (error) {
        console.warn('API save failed for leave request, using localStorage only:', error);
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
    } catch (error) {
      alert('Failed to submit leave request');
    }
  };

  const updateLeaveStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const updatedRequests = leaveRequests.map(request => 
        request.id === id 
          ? { ...request, status, updatedAt: new Date().toISOString() } 
          : request
      );
      
      localStorage.setItem('staff-leave-requests', JSON.stringify(updatedRequests));
      
      // Try to update via API
      try {
        await apiService.updateLeaveRequest(id, { status });
      } catch (error) {
        console.warn('API update failed for leave request, using localStorage only:', error);
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

  const handleSubmitEmployee = () => {
    const employee: EmployeeData = {
      id: `emp-${Date.now()}`,
      ...newEmployee,
      joinedDate: new Date().toISOString(),
      status: 'Active'
    };
    
    const updatedEmployees = [...employees, employee];
    localStorage.setItem('staff-employees', JSON.stringify(updatedEmployees));
    setEmployees(updatedEmployees);
    
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
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle size={16} />;
      case 'Rejected': return <XCircle size={16} />;
      case 'Pending': return <Clock size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      case 'Pending': return 'warning';
      default: return 'default';
    }
  };

  const renderStepContent = () => {
    switch (joiningStep) { // Changed activeStep to joiningStep
      case 0: // Basic Information
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight="bold" mb={2}>Basic Information</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label="Employee Name"
                value={newEmployee.employeeName}
                onChange={(e) => handleInputChange('employeeName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Designation"
                value={newEmployee.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Department"
                value={newEmployee.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Work Station/Location"
                value={newEmployee.workStation}
                onChange={(e) => handleInputChange('workStation', e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={newEmployee.gender}
                  label="Gender"
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nationality"
                value={newEmployee.nationality}
                onChange={(e) => handleInputChange('nationality', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={newEmployee.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Marital Status</InputLabel>
                <Select
                  value={newEmployee.maritalStatus}
                  label="Marital Status"
                  onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                >
                  <MenuItem value="Single">Single</MenuItem>
                  <MenuItem value="Married">Married</MenuItem>
                  <MenuItem value="Divorced">Divorced</MenuItem>
                  <MenuItem value="Widowed">Widowed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Blood Group"
                value={newEmployee.bloodGroup}
                onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Religion"
                value={newEmployee.religion}
                onChange={(e) => handleInputChange('religion', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Personal Mobile Number"
                value={newEmployee.personalMobile}
                onChange={(e) => handleInputChange('personalMobile', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={newEmployee.emailAddress}
                onChange={(e) => handleInputChange('emailAddress', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Emergency Contact Person"
                value={newEmployee.emergencyContactPerson}
                onChange={(e) => handleInputChange('emergencyContactPerson', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Emergency Contact Number"
                value={newEmployee.emergencyContactNumber}
                onChange={(e) => handleInputChange('emergencyContactNumber', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Permanent Address"
                multiline
                rows={2}
                value={newEmployee.permanentAddress}
                onChange={(e) => handleInputChange('permanentAddress', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Temporary Address"
                multiline
                rows={2}
                value={newEmployee.temporaryAddress}
                onChange={(e) => handleInputChange('temporaryAddress', e.target.value)}
              />
            </Grid>
          </Grid>
        );

      case 1: // Educational Qualifications
        return (
          <Box>
            <Typography variant="h6" fontWeight="bold" mb={2}>Educational Qualifications</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Add educational qualifications in chronological order (highest qualification first)
            </Typography>
            {/* Education form fields would go here */}
            <Typography variant="body1" textAlign="center" color="text.secondary" mt={4}>
              Education qualification form fields would be implemented here
            </Typography>
          </Box>
        );

      case 2: // Work Experience
        return (
          <Box>
            <Typography variant="h6" fontWeight="bold" mb={2}>Work Experience Summary</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              List previous work experience starting with the most recent
            </Typography>
            <Typography variant="body1" textAlign="center" color="text.secondary" mt={4}>
              Work experience form fields would be implemented here
            </Typography>
          </Box>
        );

      case 3: // Banking Information
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight="bold" mb={2}>Banking Information</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Please provide accurate banking details for salary processing
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bank Account Name"
                value={newEmployee.bankAccountName}
                onChange={(e) => handleInputChange('bankAccountName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bank Account Number"
                value={newEmployee.bankAccountNumber}
                onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bank Name"
                value={newEmployee.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="PAN Number"
                value={newEmployee.panNumber}
                onChange={(e) => handleInputChange('panNumber', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="National ID No"
                value={newEmployee.nationalId}
                onChange={(e) => handleInputChange('nationalId', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Provident Fund (PF) Number"
                value={newEmployee.pfNumber}
                onChange={(e) => handleInputChange('pfNumber', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="PF Contribution Branch"
                value={newEmployee.pfBranch}
                onChange={(e) => handleInputChange('pfBranch', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="CIT Number"
                value={newEmployee.citNumber}
                onChange={(e) => handleInputChange('citNumber', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="CIT Contribution Branch"
                value={newEmployee.citBranch}
                onChange={(e) => handleInputChange('citBranch', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Retirement Account Number"
                value={newEmployee.retirementAccount}
                onChange={(e) => handleInputChange('retirementAccount', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Retirement Fund Bank"
                value={newEmployee.retirementBank}
                onChange={(e) => handleInputChange('retirementBank', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SSF Number"
                value={newEmployee.ssfNumber}
                onChange={(e) => handleInputChange('ssfNumber', e.target.value)}
              />
            </Grid>
          </Grid>
        );

      case 4: // Nominee Information
        return (
          <Box>
            <Typography variant="h6" fontWeight="bold" mb={2}>Nominee Information</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Please provide details of your nominee for emergency purposes
            </Typography>
            <Typography variant="body1" textAlign="center" color="text.secondary" mt={4}>
              Nominee information form fields would be implemented here
            </Typography>
          </Box>
        );

      case 5: // Declarations
        return (
          <Box>
            <Typography variant="h6" fontWeight="bold" mb={2}>Couple Declaration</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Number of Sons"
                  type="number"
                  value={newEmployee.numberOfSons}
                  onChange={(e) => handleInputChange('numberOfSons', parseInt(e.target.value) || 0)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Number of Daughters"
                  type="number"
                  value={newEmployee.numberOfDaughters}
                  onChange={(e) => handleInputChange('numberOfDaughters', parseInt(e.target.value) || 0)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Number of Dependents"
                  type="number"
                  value={newEmployee.numberOfDependents}
                  onChange={(e) => handleInputChange('numberOfDependents', parseInt(e.target.value) || 0)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Employee Signature"
                  placeholder="Digital signature or name for signature"
                  value={newEmployee.employeeSignature}
                  onChange={(e) => handleInputChange('employeeSignature', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date (DD/MM/YYYY)"
                  value={newEmployee.signatureDate}
                  onChange={(e) => handleInputChange('signatureDate', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 6: // ICT Terms
        return (
          <Box>
            <Typography variant="h6" fontWeight="bold" mb={2}>ICT Services Terms and Conditions</Typography>
            <Paper variant="outlined" sx={{ p: 3, maxHeight: 300, overflowY: 'auto' }}>
              <Typography variant="body2" paragraph>
                These terms form a legal agreement between you and the Company. You must accept all principles and regulations in the Company's acceptable use policies to access and use its ICT facilities and services.
              </Typography>
              <Typography variant="body2" paragraph>
                TUNDI provides computing and ICT resources, including email, for official use to support the Company's objectives and administration. These facilities cannot be used for external projects or non-approved activities.
              </Typography>
              <Typography variant="body2" paragraph>
                TUNDI reserves the right to monitor any data, including personal email and instant messages, sent, received, or accessed within office premises as needed.
              </Typography>
            </Paper>
            <Box mt={2}>
              <Button
                variant={newEmployee.acceptsICTTerms ? "contained" : "outlined"}
                onClick={() => handleInputChange('acceptsICTTerms', !newEmployee.acceptsICTTerms)}
                fullWidth
              >
                {newEmployee.acceptsICTTerms ? 'Terms Accepted ✓' : 'Accept ICT Terms and Conditions'}
              </Button>
            </Box>
          </Box>
        );

      case 7: // Induction
        return (
          <Box>
            <Typography variant="h6" fontWeight="bold" mb={2}>Induction/Orientation Checklist</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant={newEmployee.orientationCompleted ? "contained" : "outlined"}
                  onClick={() => handleInputChange('orientationCompleted', !newEmployee.orientationCompleted)}
                  sx={{ justifyContent: 'flex-start', py: 2 }}
                >
                  ✓ Briefing about Organization, Office Rules/Regulation
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant={newEmployee.introductionToTeam ? "contained" : "outlined"}
                  onClick={() => handleInputChange('introductionToTeam', !newEmployee.introductionToTeam)}
                  sx={{ justifyContent: 'flex-start', py: 2 }}
                >
                  ✓ Introduction with Department Head & Team members
                </Button>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Other Orientation Activities"
                  multiline
                  rows={2}
                  value={newEmployee.otherOrientation}
                  onChange={(e) => handleInputChange('otherOrientation', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 8: // Office Setup
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight="bold" mb={2}>Office Assets and Setup</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant={newEmployee.laptopIssued ? "contained" : "outlined"}
                onClick={() => handleInputChange('laptopIssued', !newEmployee.laptopIssued)}
                sx={{ py: 2, mb: 2 }}
              >
                {newEmployee.laptopIssued ? 'Laptop Issued ✓' : 'Issue Laptop'}
              </Button>
              {newEmployee.laptopIssued && (
                <TextField
                  fullWidth
                  label="Laptop Brand Name"
                  value={newEmployee.laptopBrand}
                  onChange={(e) => handleInputChange('laptopBrand', e.target.value)}
                  sx={{ mt: 1 }}
                />
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant={newEmployee.mobileIssued ? "contained" : "outlined"}
                onClick={() => handleInputChange('mobileIssued', !newEmployee.mobileIssued)}
                sx={{ py: 2, mb: 2 }}
              >
                {newEmployee.mobileIssued ? 'Mobile Issued ✓' : 'Issue Mobile/Handset'}
              </Button>
              {newEmployee.mobileIssued && (
                <TextField
                  fullWidth
                  label="Mobile Details & SIM Number"
                  value={newEmployee.mobileDetails}
                  onChange={(e) => handleInputChange('mobileDetails', e.target.value)}
                  sx={{ mt: 1 }}
                />
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant={newEmployee.emailIssued ? "contained" : "outlined"}
                onClick={() => handleInputChange('emailIssued', !newEmployee.emailIssued)}
                sx={{ py: 2 }}
              >
                {newEmployee.emailIssued ? 'Office Email Issued ✓' : 'Issue Office Email'}
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant={newEmployee.hrisAccess ? "contained" : "outlined"}
                onClick={() => handleInputChange('hrisAccess', !newEmployee.hrisAccess)}
                sx={{ py: 2 }}
              >
                {newEmployee.hrisAccess ? 'HRIS Access Granted ✓' : 'Grant HRIS Access'}
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Basic Salary"
                value={newEmployee.basicSalary}
                onChange={(e) => handleInputChange('basicSalary', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Allowances"
                value={newEmployee.allowances}
                onChange={(e) => handleInputChange('allowances', e.target.value)}
              />
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', overflowY: 'auto', p: 2 }}>
      <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight="900">Staff Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage employee leave requests and onboarding
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button 
            variant="outlined" 
            startIcon={<FileText size={16}/>} 
            onClick={() => setIsLeaveModalOpen(true)}
          >
            New Leave Request
          </Button>
          <Button 
            variant="contained" 
            startIcon={<User size={16}/>} 
            onClick={() => setIsJoiningModalOpen(true)}
          >
            New Employee
          </Button>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Leave Requests (${leaveRequests.length})`} icon={<Calendar size={16} />} iconPosition="start" />
          <Tab label={`Employees (${employees.length})`} icon={<Users size={16} />} iconPosition="start" />
        </Tabs>

        <Box p={3}>
          {/* Filters */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder={activeTab === 0 ? "Search by employee name or ID..." : "Search by employee name or department..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search size={18} style={{ marginRight: 8, color: '#64748b' }} />
                  }}
                />
              </Grid>
              {activeTab === 0 && (
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Status Filter</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Status Filter"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="All">All Status</MenuItem>
                      <MenuItem value="Pending">Pending</MenuItem>
                      <MenuItem value="Approved">Approved</MenuItem>
                      <MenuItem value="Rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} md={activeTab === 0 ? 3 : 6}>
                <Box display="flex" justifyContent="flex-end">
                  <Tooltip title="Export to PDF">
                    <IconButton>
                      <Download size={20} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Leave Requests Tab */}
          {activeTab === 0 && (
            <Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                  <Typography variant="h6">Loading leave requests...</Typography>
                </Box>
              ) : (
                <>
                  {/* Statistics Cards */}
                  <Grid container spacing={2} mb={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h4" color="primary" fontWeight="bold">
                            {leaveRequests.filter(r => r.status === 'Pending').length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Pending Requests
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h4" color="success.main" fontWeight="bold">
                            {leaveRequests.filter(r => r.status === 'Approved').length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Approved
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h4" color="error.main" fontWeight="bold">
                            {leaveRequests.filter(r => r.status === 'Rejected').length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Rejected
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h4" color="info.main" fontWeight="bold">
                            {leaveRequests.reduce((sum, r) => sum + r.numberOfDays, 0)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Leave Days
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Leave Requests Table */}
                  <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'slate.50' }}>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Employee</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Leave Type</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Dates</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Days</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Status</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredLeaveRequests.map(request => ( // Use filteredLeaveRequests
                            <TableRow key={request.id} hover>
                              <TableCell>
                                <Stack direction="column" spacing={0.5}>
                                  <Typography variant="body2" fontWeight="bold">
                                    {request.employeeName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ID: {request.employeeId} | {request.department}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {request.designation}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={request.leaveType} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                                />
                              </TableCell>
                              <TableCell>
                                <Stack direction="column" spacing={0.5}>
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Calendar size={14} />
                                    <Typography variant="body2">
                                      {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                                    </Typography>
                                  </Stack>
                                  <Typography variant="caption" color="text.secondary">
                                    Applied: {new Date(request.createdAt).toLocaleDateString()}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                  {request.numberOfDays} days
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  icon={getStatusIcon(request.status)}
                                  label={request.status} 
                                  size="small" 
                                  color={getStatusColor(request.status) as any}
                                  variant="filled"
                                  sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Stack direction="row" justifyContent="flex-end" spacing={1}>
                                  {request.status === 'Pending' && (
                                    <>
                                      <Button 
                                        variant="outlined" 
                                        size="small" 
                                        color="success"
                                        startIcon={<CheckCircle size={16}/>}
                                        onClick={() => updateLeaveStatus(request.id, 'Approved')}
                                      >
                                        Approve
                                      </Button>
                                      <Button 
                                        variant="outlined" 
                                        size="small" 
                                        color="error"
                                        startIcon={<XCircle size={16}/>}
                                        onClick={() => updateLeaveStatus(request.id, 'Rejected')}
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  <Button 
                                    variant="outlined" 
                                    size="small" 
                                    startIcon={<FileText size={16}/>}
                                  >
                                    View Details
                                  </Button>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </>
              )}
            </Box>
          )}

          {/* Employees Tab */}
          {activeTab === 1 && (
            <Box>
              {/* Stats Cards */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        {employees.filter(e => e.status === 'Active').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Employees
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="info.main" fontWeight="bold">
                        {new Set(employees.map(e => e.department)).size}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Departments
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Employees Grid */}
              <Grid container spacing={2}>
                {filteredEmployees.map(employee => (
                  <Grid item xs={12} md={6} lg={4} key={employee.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Box>
                            <Typography variant="h6" fontWeight="bold">
                              {employee.employeeName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {employee.designation}
                            </Typography>
                          </Box>
                          <Chip 
                            label={employee.status} 
                            size="small" 
                            color={employee.status === 'Active' ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </Box>
                        
                        <Divider sx={{ my: 1 }} />
                        
                        <Stack spacing={1} mt={2}>
                          <Typography variant="body2">
                            <strong>Department:</strong> {employee.department}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Email:</strong> {employee.emailAddress}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Mobile:</strong> {employee.personalMobile}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Joined:</strong> {new Date(employee.joinedDate).toLocaleDateString()}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              {filteredEmployees.length === 0 && (
                <Typography textAlign="center" color="text.secondary" py={4}>
                  No employees found
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {/* New Leave Request Modal */}
      <Dialog open={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FileText className="text-indigo-600" /> Submit Leave Request
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmitLeaveRequest} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="Employee ID"
                  value={newLeaveRequest.employeeId}
                  onChange={(e) => setNewLeaveRequest({...newLeaveRequest, employeeId: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="Employee Name"
                  value={newLeaveRequest.employeeName}
                  onChange={(e) => setNewLeaveRequest({...newLeaveRequest, employeeName: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={newLeaveRequest.department}
                  onChange={(e) => setNewLeaveRequest({...newLeaveRequest, department: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Designation"
                  value={newLeaveRequest.designation}
                  onChange={(e) => setNewLeaveRequest({...newLeaveRequest, designation: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Leave Type</InputLabel>
                  <Select
                    value={newLeaveRequest.leaveType}
                    label="Leave Type"
                    onChange={(e) => setNewLeaveRequest({...newLeaveRequest, leaveType: e.target.value as any})}
                  >
                    <MenuItem value="Annual">Annual Leave</MenuItem>
                    <MenuItem value="Sick">Sick Leave</MenuItem>
                    <MenuItem value="Home">Home Leave</MenuItem>
                    <MenuItem value="Maternity/Paternity/Parental">Maternity/Paternity/Parental Leave</MenuItem>
                    <MenuItem value="Bereavement">Bereavement Leave</MenuItem>
                    <MenuItem value="Other">Other Leave</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="Start Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={newLeaveRequest.startDate}
                  onChange={(e) => setNewLeaveRequest({...newLeaveRequest, startDate: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="End Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={newLeaveRequest.endDate}
                  onChange={(e) => setNewLeaveRequest({...newLeaveRequest, endDate: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Reason for Leave"
                  multiline
                  rows={3}
                  value={newLeaveRequest.reason}
                  onChange={(e) => setNewLeaveRequest({...newLeaveRequest, reason: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Work Handover To"
                  placeholder="Person name and signature"
                  value={newLeaveRequest.workHandoverTo}
                  onChange={(e) => setNewLeaveRequest({...newLeaveRequest, workHandoverTo: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Alternate Contact Number"
                  value={newLeaveRequest.alternateContact}
                  onChange={(e) => setNewLeaveRequest({...newLeaveRequest, alternateContact: e.target.value})}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsLeaveModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitLeaveRequest}>Submit Request</Button>
        </DialogActions>
      </Dialog>

      {/* New Employee Modal */}
      <Paper 
        sx={{ 
          position: 'fixed', 
          bottom: 20, 
          right: 20, 
          width: 500, 
          maxHeight: '80vh', 
          overflowY: 'auto',
          zIndex: 1000,
          display: isJoiningModalOpen ? 'block' : 'none',
          borderRadius: 2,
          boxShadow: 3
        }}
      >
        <Box p={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">New Employee</Typography>
            <IconButton onClick={() => setIsJoiningModalOpen(false)}>×</IconButton>
          </Box>
          
          <Stepper activeStep={joiningStep} alternativeLabel sx={{ mb: 4 }}>
            {joiningSteps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Divider sx={{ mb: 3 }} />

          {/* Step Content */}
          <Box sx={{ minHeight: 400 }}>
            {renderStepContent()}
          </Box>

          <Divider sx={{ mt: 3, mb: 2 }} />

          {/* Navigation Buttons */}
          <Box display="flex" justifyContent="space-between">
            <Button
              onClick={handleBackJoiningStep}
              disabled={joiningStep === 0}
            >
              ← Back
            </Button>
            
            {joiningStep === joiningSteps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmitEmployee}
                endIcon={<Save />}
              >
                Submit Form
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNextJoiningStep}
              >
                Next →
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default StaffManagementModule;