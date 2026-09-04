import React, { useState, useMemo } from 'react';
import { Project, AppSettings, MeasurementSheet, MeasurementSheetEntry, UserRole } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import {
    ClipboardList, Plus, CheckCircle2,
    FileText, Send, BarChart3,
    Trash2, Edit, AlertTriangle,
    ChevronDown, ChevronUp, Save
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Textarea } from '~/components/ui/textarea';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Progress } from '~/components/ui/progress';
import { Badge } from '~/components/ui/badge';

interface Props {
  project: Project;
  settings: AppSettings;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const MeasurementSheetModule: React.FC<Props> = ({ project, settings, userRole, onProjectUpdate }) => {
    const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [expandedEntries, setExpandedEntries] = useState(new Set<string>());

    const [sheetForm, setSheetForm] = useState({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        location: '',
        measuredBy: '',
        checkedBy: '',
        approvedBy: ''
    });

    const [entryForm, setEntryForm] = useState({
        boqItemId: '',
        quantity: 0,
        length: 0,
        breadth: 0,
        height: 0,
        remarks: ''
    });

    const canEdit = [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER].includes(userRole);
    const canApprove = [UserRole.ADMIN, UserRole.PROJECT_MANAGER].includes(userRole);

    const measurementSheets = project?.measurementSheets || [];
    const pendingSheets = measurementSheets.filter(s => s.status === 'Submitted');
    const approvedSheets = measurementSheets.filter(s => s.status === 'Approved');
    const rejectedSheets = measurementSheets.filter(s => s.status === 'Rejected');

    const selectedSheet = measurementSheets.find(s => s.id === selectedSheetId);

    const filteredSheets = useMemo(() => {
        switch (activeTab) {
            case 'pending': return pendingSheets;
            case 'approved': return approvedSheets;
            case 'rejected': return rejectedSheets;
            default: return measurementSheets;
        }
    }, [activeTab, measurementSheets, pendingSheets, approvedSheets, rejectedSheets]);

    const handleCreateSheet = () => {
        if (!sheetForm.title || !sheetForm.date) {
            toast.error('Please fill in at least the title and date');
            return;
        }

        const newSheet: MeasurementSheet = {
            id: `ms-${Date.now()}`,
            title: sheetForm.title,
            description: sheetForm.description,
            date: sheetForm.date,
            location: sheetForm.location || project.location,
            status: 'Draft',
            measuredBy: sheetForm.measuredBy,
            checkedBy: sheetForm.checkedBy,
            approvedBy: sheetForm.approvedBy,
            verifiedBy: '',
            totalAmount: 0,
            entries: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            projectId: project.id
        };

        onProjectUpdate({
            ...project,
            measurementSheets: [...measurementSheets, newSheet]
        });

        setIsCreateModalOpen(false);
        setSheetForm({
            title: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            location: '',
            measuredBy: '',
            checkedBy: '',
            approvedBy: ''
        });
        setSelectedSheetId(newSheet.id);
        toast.success('Measurement sheet created');
    };

    const handleAddEntry = () => {
        if (!selectedSheet || !entryForm.boqItemId) {
            toast.error('Please select a BOQ item');
            return;
        }

        const boqItem = project.boq.find(b => b.id === entryForm.boqItemId);
        if (!boqItem) {
            toast.error('BOQ item not found');
            return;
        }

        const quantity = entryForm.quantity || (entryForm.length * entryForm.breadth * entryForm.height);
        const amount = quantity * boqItem.rate;

        const newEntry: MeasurementSheetEntry = {
            id: `entry-${Date.now()}`,
            boqItemId: entryForm.boqItemId,
            itemNo: boqItem.itemNo,
            description: boqItem.description,
            unit: boqItem.unit,
            quantity: quantity,
            length: entryForm.length || undefined,
            breadth: entryForm.breadth || undefined,
            height: entryForm.height || undefined,
            rate: boqItem.rate,
            amount: amount,
            remarks: entryForm.remarks,
            location: selectedSheet.location,
            date: selectedSheet.date
        };

        const updatedSheet = {
            ...selectedSheet,
            entries: [...selectedSheet.entries, newEntry],
            updatedAt: new Date().toISOString()
        };

        const updatedSheets = measurementSheets.map(s => 
            s.id === selectedSheet.id ? updatedSheet : s
        );

        onProjectUpdate({ ...project, measurementSheets: updatedSheets });
        setIsEntryDialogOpen(false);
        setEntryForm({
            boqItemId: '',
            quantity: 0,
            length: 0,
            breadth: 0,
            height: 0,
            remarks: ''
        });
        toast.success('Entry added');
    };

    const handleDeleteEntry = (entryId: string) => {
        if (!selectedSheet) return;

        const updatedSheet = {
            ...selectedSheet,
            entries: selectedSheet.entries.filter(e => e.id !== entryId),
            updatedAt: new Date().toISOString()
        };

        const updatedSheets = measurementSheets.map(s => 
            s.id === selectedSheet.id ? updatedSheet : s
        );

        onProjectUpdate({ ...project, measurementSheets: updatedSheets });
        toast.success('Entry removed');
    };

    const handleSubmitForApproval = () => {
        if (!selectedSheet) return;
        if (selectedSheet.entries.length === 0) {
            toast.error('Cannot submit empty measurement sheet');
            return;
        }

        const updatedSheet = {
            ...selectedSheet,
            status: 'Submitted' as const,
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const updatedSheets = measurementSheets.map(s => 
            s.id === selectedSheet.id ? updatedSheet : s
        );

        onProjectUpdate({ ...project, measurementSheets: updatedSheets });
        toast.success('Measurement sheet submitted for approval');
    };

    const handleApprove = () => {
        if (!selectedSheet) return;

        const updatedSheet = {
            ...selectedSheet,
            status: 'Approved' as const,
            approvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const updatedSheets = measurementSheets.map(s => 
            s.id === selectedSheet.id ? updatedSheet : s
        );

        onProjectUpdate({ ...project, measurementSheets: updatedSheets });
        toast.success('Measurement sheet approved');
    };

    const handleReject = () => {
        if (!selectedSheet) return;

        const updatedSheet = {
            ...selectedSheet,
            status: 'Rejected' as const,
            updatedAt: new Date().toISOString()
        };

        const updatedSheets = measurementSheets.map(s => 
            s.id === selectedSheet.id ? updatedSheet : s
        );

        onProjectUpdate({ ...project, measurementSheets: updatedSheets });
        toast.success('Measurement sheet rejected');
    };

    const toggleExpand = (id: string) => {
        const next = new Set(expandedEntries);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedEntries(next);
    };

    const calculateSheetTotal = (sheet: MeasurementSheet) => {
        return sheet.entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-800 border-green-300';
            case 'Submitted': return 'bg-amber-100 text-amber-800 border-amber-300';
            case 'Rejected': return 'bg-red-100 text-red-800 border-red-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex gap-3">
            {/* Left Panel - Sheet List */}
            <Card className="w-80 flex flex-col">
                <CardHeader className="border-b px-4 py-3">
                    <CardTitle className="text-lg font-bold">Measurement Sheets</CardTitle>
                    <Button className="mt-3 w-full" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> New Sheet
                    </Button>
                </CardHeader>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="px-2 pt-2">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="all" className="text-xs">All ({measurementSheets.length})</TabsTrigger>
                        <TabsTrigger value="pending" className="text-xs">Pending ({pendingSheets.length})</TabsTrigger>
                        <TabsTrigger value="approved" className="text-xs">Approved ({approvedSheets.length})</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex-1 overflow-y-auto px-2 py-2">
                    {filteredSheets.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                            <ClipboardList className="mx-auto h-8 w-8 opacity-40 mb-2"/>
                            <p className="text-sm">No measurement sheets found.</p>
                        </div>
                    ) : (
                        filteredSheets.map(sheet => (
                            <div 
                                key={sheet.id}
                                className={`p-3 mb-2 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                                    selectedSheetId === sheet.id ? 'border-primary bg-accent' : 'border-border'
                                }`}
                                onClick={() => setSelectedSheetId(sheet.id)}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-sm">{sheet.title}</h4>
                                    <Badge className={`text-xs ${getStatusColor(sheet.status)}`}>
                                        {sheet.status}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-1">
                                    {sheet.date} • {sheet.location}
                                </p>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-muted-foreground">
                                        {sheet.entries.length} entries
                                    </p>
                                    <p className="text-sm font-bold text-green-600">
                                        {formatCurrency(calculateSheetTotal(sheet), settings.currency)}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* Right Panel - Sheet Details */}
            <div className="flex-1 overflow-y-auto">
                {selectedSheet ? (
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="flex justify-between items-center p-4">
                                <div>
                                    <h3 className="text-xl font-bold">{selectedSheet.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedSheet.date} • {selectedSheet.location} • {selectedSheet.entries.length} entries
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge className={getStatusColor(selectedSheet.status)}>
                                            {selectedSheet.status}
                                        </Badge>
                                        <span className="text-sm font-bold text-green-600">
                                            Total: {formatCurrency(calculateSheetTotal(selectedSheet), settings.currency)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {canEdit && selectedSheet.status === 'Draft' && (
                                        <Button variant="outline" size="sm" onClick={() => setIsEntryDialogOpen(true)}>
                                            <Plus className="mr-2 h-4 w-4" /> Add Entry
                                        </Button>
                                    )}
                                    {selectedSheet.status === 'Draft' && (
                                        <Button variant="outline" size="sm" onClick={handleSubmitForApproval}>
                                            <Send className="mr-2 h-4 w-4" /> Submit
                                        </Button>
                                    )}
                                    {canApprove && selectedSheet.status === 'Submitted' && (
                                        <>
                                            <Button variant="outline" size="sm" className="text-red-600" onClick={handleReject}>
                                                <AlertTriangle className="mr-2 h-4 w-4" /> Reject
                                            </Button>
                                            <Button size="sm" onClick={handleApprove}>
                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {selectedSheet.description && (
                            <Alert>
                                <FileText className="h-4 w-4" />
                                <AlertTitle>Description</AlertTitle>
                                <AlertDescription>{selectedSheet.description}</AlertDescription>
                            </Alert>
                        )}

                        {/* Measurement Entries Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Measurement Entries</CardTitle>
                                <CardDescription>
                                    BOQ items with measured quantities
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted">
                                            <TableHead className="w-12">SN</TableHead>
                                            <TableHead>Item No</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Unit</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Rate</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead>Remarks</TableHead>
                                            <TableHead className="w-20"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedSheet.entries.map((entry, idx) => (
                                            <TableRow key={entry.id}>
                                                <TableCell className="font-bold">{idx + 1}</TableCell>
                                                <TableCell className="font-bold text-primary">{entry.itemNo}</TableCell>
                                                <TableCell className="text-xs max-w-[300px] truncate" title={entry.description}>
                                                    {entry.description}
                                                </TableCell>
                                                <TableCell>{entry.unit}</TableCell>
                                                <TableCell className="text-right">
                                                    <div>
                                                        <p className="font-bold">{entry.quantity.toLocaleString()}</p>
                                                        {(entry.length || entry.breadth || entry.height) && (
                                                            <p className="text-xs text-gray-500">
                                                                L:{entry.length}m × B:{entry.breadth}m × H:{entry.height}m
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">{entry.rate.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold">{entry.amount.toLocaleString()}</TableCell>
                                                <TableCell className="text-xs max-w-[150px] truncate">{entry.remarks}</TableCell>
                                                <TableCell>
                                                    {selectedSheet.status === 'Draft' && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            className="h-8 w-8 text-red-600"
                                                            onClick={() => handleDeleteEntry(entry.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {selectedSheet.entries.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                                    No entries yet. Click "Add Entry" to start adding measurements.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                    {selectedSheet.entries.length > 0 && (
                                        <tfoot>
                                            <TableRow className="bg-green-50 font-bold">
                                                <TableCell colSpan={6} className="text-right text-lg">Total</TableCell>
                                                <TableCell className="text-right text-lg text-green-700">
                                                    {formatCurrency(calculateSheetTotal(selectedSheet), settings.currency)}
                                                </TableCell>
                                                <TableCell colSpan={2}></TableCell>
                                            </TableRow>
                                        </tfoot>
                                    )}
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                        <ClipboardList className="h-20 w-20 opacity-20 mb-4"/>
                        <p className="text-lg">Select or create a Measurement Sheet</p>
                        <p className="text-sm mt-2">Measurement sheets are used to record field measurements before creating IPCs</p>
                    </div>
                )}
            </div>

            {/* Create Measurement Sheet Dialog */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center">
                            <ClipboardList className="mr-2 h-5 w-5 text-primary" />
                            New Measurement Sheet
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={sheetForm.title}
                                onChange={e => setSheetForm({...sheetForm, title: e.target.value})}
                                placeholder="e.g., MB 01 - Drivertol-Shivapur Road"
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={sheetForm.description}
                                onChange={e => setSheetForm({...sheetForm, description: e.target.value})}
                                placeholder="Optional description..."
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="date">Date *</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={sheetForm.date}
                                    onChange={e => setSheetForm({...sheetForm, date: e.target.value})}
                                />
                            </div>
                            <div>
                                <Label htmlFor="location">Location</Label>
                                <Input
                                    id="location"
                                    value={sheetForm.location}
                                    onChange={e => setSheetForm({...sheetForm, location: e.target.value})}
                                    placeholder="e.g., Chainage 3+650 to 3+937"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="measured-by">Measured By</Label>
                            <Input
                                id="measured-by"
                                value={sheetForm.measuredBy}
                                onChange={e => setSheetForm({...sheetForm, measuredBy: e.target.value})}
                                placeholder="Name of person who measured"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="checked-by">Checked By</Label>
                                <Input
                                    id="checked-by"
                                    value={sheetForm.checkedBy}
                                    onChange={e => setSheetForm({...sheetForm, checkedBy: e.target.value})}
                                    placeholder="Engineer name"
                                />
                            </div>
                            <div>
                                <Label htmlFor="approved-by">Approved By</Label>
                                <Input
                                    id="approved-by"
                                    value={sheetForm.approvedBy}
                                    onChange={e => setSheetForm({...sheetForm, approvedBy: e.target.value})}
                                    placeholder="Project Manager name"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateSheet}>
                            <Save className="mr-2 h-4 w-4" /> Create Sheet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Entry Dialog */}
            <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center">
                            <Plus className="mr-2 h-5 w-5 text-primary" />
                            Add Measurement Entry
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label htmlFor="boq-item">BOQ Item *</Label>
                            <Select
                                value={entryForm.boqItemId}
                                onValueChange={value => setEntryForm({...entryForm, boqItemId: value})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a BOQ item" />
                                </SelectTrigger>
                                <SelectContent>
                                    {project.boq.map(item => (
                                        <SelectItem key={item.id} value={item.id}>
                                            [{item.itemNo}] {item.description.substring(0, 40)}...
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {entryForm.boqItemId && (
                            <div className="p-3 bg-muted/50 rounded border">
                                <p className="text-sm font-semibold">
                                    {project.boq.find(b => b.id === entryForm.boqItemId)?.description}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Unit: {project.boq.find(b => b.id === entryForm.boqItemId)?.unit} | 
                                    Rate: {formatCurrency(project.boq.find(b => b.id === entryForm.boqItemId)?.rate || 0, settings.currency)}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="length">Length (m)</Label>
                                <Input
                                    id="length"
                                    type="number"
                                    step="0.001"
                                    value={entryForm.length || ''}
                                    onChange={e => setEntryForm({...entryForm, length: Number(e.target.value)})}
                                />
                            </div>
                            <div>
                                <Label htmlFor="breadth">Breadth (m)</Label>
                                <Input
                                    id="breadth"
                                    type="number"
                                    step="0.001"
                                    value={entryForm.breadth || ''}
                                    onChange={e => setEntryForm({...entryForm, breadth: Number(e.target.value)})}
                                />
                            </div>
                            <div>
                                <Label htmlFor="height">Height (m)</Label>
                                <Input
                                    id="height"
                                    type="number"
                                    step="0.001"
                                    value={entryForm.height || ''}
                                    onChange={e => setEntryForm({...entryForm, height: Number(e.target.value)})}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="quantity">OR Direct Quantity</Label>
                            <Input
                                id="quantity"
                                type="number"
                                step="0.001"
                                value={entryForm.quantity || ''}
                                onChange={e => {
                                    const qty = Number(e.target.value);
                                    setEntryForm({...entryForm, quantity: qty});
                                }}
                                placeholder="Enter quantity directly"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                If L×B×H is provided, quantity = L × B × H. Otherwise enter quantity directly.
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="remarks">Remarks</Label>
                            <Textarea
                                id="remarks"
                                value={entryForm.remarks}
                                onChange={e => setEntryForm({...entryForm, remarks: e.target.value})}
                                placeholder="Optional remarks..."
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEntryDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddEntry}>
                            <Save className="mr-2 h-4 w-4" /> Add Entry
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MeasurementSheetModule;