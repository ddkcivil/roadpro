
import React, { useState, useMemo } from 'react';
import { 
    FileDiff, Plus, Search, Trash2, Save, X, 
    CheckCircle2, AlertTriangle, TrendingUp, History, 
    Calculator, Receipt, Info, ArrowRight, DollarSign,
    CheckCircle, Clock, FileEdit, Send, FileX, Calendar
} from 'lucide-react';
import { Project, UserRole, AppSettings, VariationOrder, VariationItem, BOQItem, WorkCategory } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Progress } from '~/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { toast } from 'sonner';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Textarea } from '~/components/ui/textarea';
import { Separator } from '~/components/ui/separator';

interface Props {
  project: Project;
  userRole: UserRole;
  settings: AppSettings;
  onProjectUpdate: (project: Project) => void;
}

const VariationModule: React.FC<Props> = ({ project, settings, onProjectUpdate, userRole }) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedVoId, setSelectedVoId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    if (!project) {
        return (
            <div className="p-8 text-center">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Project data not available. Please select a project first.</AlertDescription>
                </Alert>
            </div>
        );
    }

    const [voForm, setVoForm] = useState<Partial<VariationOrder>>({
        voNumber: `VO-${((project?.variationOrders || [])?.length || 0) + 1}`,
        title: '',
        date: new Date().toISOString().split('T')[0],
        reason: '',
        items: []
    });

    const [tempItem, setTempItem] = useState<Partial<VariationItem>>({
        description: '', unit: '', quantityDelta: 0, rate: 0, isNewItem: false
    });

    const currency = formatCurrency(0, settings).substring(0, formatCurrency(0, settings).indexOf('0'));
    const variationOrders = project?.variationOrders || [];
    
    const financialSummary = useMemo(() => {
        const boqItems = project?.boq || [];
        const vatRate = settings?.vatRate || 13;
        
        // --- Original Contract Calculation (a + b + c) ---
        // a = Sum of Ps(units)
        const originalPS = boqItems
            .filter(item => item.unit?.toUpperCase() === 'PS')
            .reduce((acc, item) => acc + (item.quantity * item.rate), 0);
            
        // b = Sum other than ps(unit)
        const originalNonPS = boqItems
            .filter(item => item.unit?.toUpperCase() !== 'PS')
            .reduce((acc, item) => acc + (item.quantity * item.rate), 0);
            
        // c = vat * b
        const originalVAT = originalNonPS * (vatRate / 100);
        const originalTotal = originalPS + originalNonPS + originalVAT;

        // --- Revised Contract Calculation (a_rev + b_rev + c_rev) ---
        // a_rev = Sum of Ps with variations
        const revisedPS = boqItems
            .filter(item => item.unit?.toUpperCase() === 'PS')
            .reduce((acc, item) => acc + ((item.quantity + (item.variationQuantity || 0)) * item.rate), 0);
            
        // b_rev = Sum non-Ps with variations
        const revisedNonPS = boqItems
            .filter(item => item.unit?.toUpperCase() !== 'PS')
            .reduce((acc, item) => acc + ((item.quantity + (item.variationQuantity || 0)) * item.rate), 0);
            
        // c_rev = vat * b_rev
        const revisedVAT = revisedNonPS * (vatRate / 100);
        const revisedTotal = revisedPS + revisedNonPS + revisedVAT;

        const variationImpact = revisedTotal - originalTotal;
        
        return { 
            original: originalTotal, 
            variation: variationImpact, 
            revised: revisedTotal, 
            percent: originalTotal > 0 ? (variationImpact / originalTotal) * 100 : 0 
        };
    }, [project?.boq, settings]);

    const viewingVO = useMemo(() => variationOrders.find(v => v.id === selectedVoId), [selectedVoId, variationOrders]);

    const handleAddItemToVO = () => {
        if (!tempItem.description || !tempItem.quantityDelta) return;
        
        const newItem: VariationItem = {
            id: `voi-${Date.now()}-${Math.random()}`,
            boqItemId: tempItem.boqItemId,
            isNewItem: tempItem.isNewItem || false,
            description: tempItem.description!,
            unit: tempItem.unit || 'unit',
            quantityDelta: Number(tempItem.quantityDelta),
            rate: Number(tempItem.rate)
        };

        setVoForm(prev => ({
            ...prev,
            items: [...(prev.items || []), newItem]
        }));
        
        setTempItem({ description: '', unit: '', quantityDelta: 0, rate: 0, isNewItem: false });
    };

    const handleRemoveItemFromVO = (id: string) => {
        setVoForm(prev => ({
            ...prev,
            items: prev.items?.filter(i => i.id !== id)
        }));
    };

    const handleSaveVODraft = () => {
        if (!voForm.title || !voForm.items?.length) return;
        
        const totalImpact = voForm.items.reduce((acc, i) => acc + (i.quantityDelta * i.rate), 0);
        const finalVO: VariationOrder = {
            ...voForm,
            id: `vo-${Date.now()}`,
            status: 'Draft',
            totalImpact
        } as VariationOrder;

        onProjectUpdate({
            ...project,
            variationOrders: [...variationOrders, finalVO]
        });
        setIsCreateModalOpen(false);
        setVoForm({ 
            voNumber: `VO-${(project.variationOrders?.length || 0) + 2}`, 
            title: '', 
            items: [], 
            reason: '', 
            date: new Date().toISOString().split('T')[0] 
        });
    };

    const updateVOStatus = (voId: string, newStatus: VariationOrder['status']) => {
        let updatedBOQ = [...(project?.boq || [])];
        const updatedVOs = variationOrders.map(v => {
            if (v.id === voId) {
                if (newStatus === 'Approved') {
                    // Sync logic for BOQ update
                    v.items.forEach(item => {
                        if (item.isNewItem) {
                            updatedBOQ.push({
                                id: `boq-ns-${Date.now()}-${Math.random()}`,
                                itemNo: `NS-${updatedBOQ.length + 1}`,
                                description: item.description,
                                unit: item.unit,
                                quantity: 0,
                                variationQuantity: item.quantityDelta,
                                revisedQuantity: item.quantityDelta,
                                rate: item.rate,
                                amount: item.rate * item.quantityDelta, // Calculate amount
                                location: '', // Default empty location
                                category: WorkCategory.EXTRA_WORK,
                                completedQuantity: 0
                            });
                        } else {
                            const boqIdx = updatedBOQ.findIndex(b => b.id === item.boqItemId);
                            if (boqIdx !== -1) {
                                const currentVar = updatedBOQ[boqIdx].variationQuantity || 0;
                                updatedBOQ[boqIdx].variationQuantity = currentVar + item.quantityDelta;
                                updatedBOQ[boqIdx].revisedQuantity = updatedBOQ[boqIdx].quantity + updatedBOQ[boqIdx].variationQuantity;
                            }
                        }
                    });
                }
                return { ...v, status: newStatus };
            }
            return v;
        });

        onProjectUpdate({ 
            ...project, 
            variationOrders: updatedVOs,
            boq: updatedBOQ
        });
    };

    const handleDeleteVO = (voId: string) => {
        if (confirm("Permanently delete this variation record?")) {
            onProjectUpdate({ 
                ...project, 
                variationOrders: variationOrders.filter(v => v.id !== voId) 
            });
            if (selectedVoId === voId) setSelectedVoId(null);
        }
    };

    const canApprove = [UserRole.ADMIN, UserRole.PROJECT_MANAGER].includes(userRole);

    return (
        <div className="h-[calc(100vh-140px)] flex gap-3 animate-in fade-in duration-500">
            <Card className="w-80 flex flex-col">
                <CardHeader className="border-b px-4 py-3">
                    <CardTitle className="text-lg font-bold">Contract Variations</CardTitle>
                    <Button className="mt-3 w-full" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />Initialize Draft
                    </Button>
                </CardHeader>
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4">
                        <Input 
                            placeholder="Search variations..." 
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            // Assuming Input can take an icon prop, if not, adjust or wrap with an icon component
                            // icon={<Search className="h-4 w-4 text-muted-foreground" />} 
                        />
                    </div>
                    <div>
                        {[...variationOrders].reverse().map(vo => (
                            <div key={vo.id}>
                                <Card 
                                    className={`m-2 p-4 cursor-pointer hover:bg-muted 
                                                ${selectedVoId === vo.id ? 'border-primary bg-primary/10' : ''}`}
                                    onClick={() => setSelectedVoId(vo.id)}
                                >
                                    <div className="flex justify-between mb-1">
                                        <Badge variant="outline" className="text-xs font-bold text-primary">{vo.voNumber}</Badge>
                                        <Badge 
                                            variant={vo.status === 'Approved' ? 'default' : vo.status === 'Rejected' ? 'destructive' : vo.status === 'Submitted' ? 'secondary' : 'outline'}
                                            className="text-xs"
                                        >
                                            {vo.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <p className="font-bold line-clamp-1 mb-1">{vo.title}</p>
                                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/> {vo.date}</span>
                                        <span className={`font-bold ${vo.totalImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(vo.totalImpact, settings)}
                                        </span>
                                    </div>
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            <div className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">REVISED CONTRACT TOTAL</p>
                                    <p className="text-3xl font-bold">{formatCurrency(financialSummary.revised, settings)}</p>
                                    <p className="text-sm text-muted-foreground">Original: {formatCurrency(financialSummary.original, settings)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">NET CHANGE IMPACT</p>
                                    <p className={`text-3xl font-bold ${financialSummary.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(financialSummary.variation, settings)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Progress value={Math.min(100, Math.abs(financialSummary.percent) * 5)} className="flex-1" />
                                        <p className="text-sm font-bold">{financialSummary.percent.toFixed(2)}%</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Button variant="outline" className="w-full" onClick={() => toast.info('Financial History view would open here')}><History className="mr-2 h-4 w-4"/>Financial History</Button>
                                    <Button variant="outline" className="w-full" onClick={() => toast.info('Variation S-Curve visualization would open here')}><TrendingUp className="mr-2 h-4 w-4"/>Variation S-Curve</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {viewingVO ? (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-primary text-white flex items-center justify-center">
                                        <FileDiff className="h-6 w-6"/>
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-bold">{viewingVO.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground">REF: {viewingVO.voNumber} • STATUS: <b className="uppercase">{viewingVO.status}</b></p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {viewingVO.status === 'Draft' && (
                                        <>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteVO(viewingVO.id)}><Trash2 className="h-5 w-5"/></Button>
                                            <Button onClick={() => updateVOStatus(viewingVO.id, 'Submitted')}><Send className="mr-2 h-4 w-4"/>Submit for Review</Button>
                                        </>
                                    )}
                                    {viewingVO.status === 'Submitted' && canApprove && (
                                        <>
                                            <Button variant="outline" className="text-red-500 hover:bg-red-500/10" onClick={() => updateVOStatus(viewingVO.id, 'Rejected')}><FileX className="mr-2 h-4 w-4"/>Reject</Button>
                                            <Button onClick={() => updateVOStatus(viewingVO.id, 'Approved')}><CheckCircle2 className="mr-2 h-4 w-4"/>Approve & Sync</Button>
                                        </>
                                    )}
                                    {viewingVO.status === 'Approved' && (
                                        <Badge><CheckCircle className="mr-2 h-4 w-4"/>APPROVED & SYNCED</Badge>
                                    )}
                                    {viewingVO.status === 'Rejected' && (
                                        <Button variant="outline" onClick={() => updateVOStatus(viewingVO.id, 'Draft')}><FileEdit className="mr-2 h-4 w-4"/>Revise Draft</Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">TECHNICAL JUSTIFICATION</p>
                                        <Card className="p-4 bg-muted border-dashed">
                                            <p className="text-sm leading-relaxed">{viewingVO.reason || 'No written justification provided.'}</p>
                                        </Card>
                                        <div className="mt-4">
                                            <p className="text-xs font-bold text-muted-foreground uppercase mb-2">AUDIT SUMMARY</p>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">PM</div>
                                                    <p className="text-sm">Proposed by: Site Engineering Team</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground"/>
                                                    <p className="text-sm">Created on: {viewingVO.date}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">SCHEDULE OF AMENDMENTS</p>
                                        <Card>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Work Description</TableHead>
                                                        <TableHead className="text-right">Delta Qty</TableHead>
                                                        <TableHead className="text-right">Rate</TableHead>
                                                        <TableHead className="text-right">Net Value</TableHead>
                                                        <TableHead className="text-center"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {viewingVO.items.map(item => (
                                                        <TableRow key={item.id}>
                                                            <TableCell>
                                                                <p className="font-bold line-clamp-1">{item.description}</p>
                                                                <Badge variant="outline" className="text-xs mt-1">
                                                                    {item.isNewItem ? 'NON-SCHEDULED' : 'BOQ LINKED'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <p className={`font-bold ${item.quantityDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {item.quantityDelta >= 0 ? '+' : ''}{item.quantityDelta} {item.unit}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell className="text-right">{formatCurrency(item.rate, settings)}</TableCell>
                                                            <TableCell className="text-right font-bold">
                                                                {currency}{(item.quantityDelta * item.rate).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveItemFromVO(item.id)}>
                                                                    <X className="h-4 w-4"/>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow className="bg-gray-900 text-white">
                                                        <TableCell colSpan={3} className="text-right text-white text-xs font-bold uppercase">TOTAL VO IMPACT</TableCell>
                                                        <TableCell className="text-right text-white text-base font-bold">
                                                            {formatCurrency(viewingVO.totalImpact, settings)}
                                                        </TableCell>
                                                        <TableCell></TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </Card>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="p-12 text-center border-dashed">
                            <FileDiff className="mx-auto h-20 w-20 text-muted-foreground opacity-20 mb-4"/>
                            <h3 className="text-xl font-bold">No Variation Selected</h3>
                            <p className="text-muted-foreground">Select a record from the registry or create a new draft to begin.</p>
                        </Card>
                    )}
                </div>
            </div>

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader className="border-b pb-4">
                        <DialogTitle className="flex items-center text-xl font-bold">
                            <Calculator className="mr-2 h-6 w-6 text-primary"/>
                            Draft Variation Order Worksheet
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 bg-muted/40">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Card className="p-4 space-y-4">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase">CONTRACTUAL DETAILS</h3>
                                    <div>
                                        <Label htmlFor="title">Amendment Title</Label>
                                        <Input 
                                            id="title" placeholder="e.g. KM 4-5 Add. Work"
                                            value={voForm.title} onChange={e => setVoForm({...voForm, title: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="vo-ref">VO Ref #</Label>
                                            <Input id="vo-ref" value={voForm.voNumber} disabled />
                                        </div>
                                        <div>
                                            <Label htmlFor="vo-date">Date</Label>
                                            <Input id="vo-date" type="date" value={voForm.date} onChange={e => setVoForm({...voForm, date: e.target.value})} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="justification">Technical Justification</Label>
                                        <Textarea 
                                            id="justification" placeholder="Detail the technical necessity..."
                                            value={voForm.reason} onChange={e => setVoForm({...voForm, reason: e.target.value})}
                                        />
                                    </div>
                                </Card>

                                <Card className="p-4 bg-indigo-900 text-white mt-6 space-y-4">
                                    <h3 className="text-xs font-bold text-indigo-200 uppercase">STAGING WORK ITEMS</h3>
                                    <div>
                                        <Label htmlFor="boq-component" className="text-white">Existing BOQ Component</Label>
                                        <Select
                                            onValueChange={value => {
                                                const boqItem = project.boq.find(b => b.id === value);
                                                if (boqItem) {
                                                    setTempItem({ 
                                                        boqItemId: boqItem.id, description: boqItem.description, 
                                                        unit: boqItem.unit, rate: boqItem.rate, isNewItem: false 
                                                    });
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="boq-component" className="bg-indigo-800 text-white border-indigo-700">
                                                <SelectValue placeholder="Select a BOQ item" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-indigo-800 text-white">
                                                {project.boq.map(boq => (
                                                    <SelectItem key={boq.id} value={boq.id}>[{boq.itemNo}] {boq.description}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Separator className="bg-indigo-700" />
                                    <div>
                                        <Label htmlFor="new-item-description" className="text-white">OR NEW SCOPE Item Description</Label>
                                        <Input 
                                            id="new-item-description" 
                                            value={tempItem.description} onChange={e => setTempItem({...tempItem, description: e.target.value, isNewItem: true, boqItemId: undefined})}
                                            className="bg-indigo-800 text-white border-indigo-700"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="qty-delta" className="text-white">Qty Delta</Label>
                                            <Input 
                                                id="qty-delta" type="number" 
                                                value={tempItem.quantityDelta} onChange={e => setTempItem({...tempItem, quantityDelta: Number(e.target.value)})}
                                                className="bg-indigo-800 text-white border-indigo-700"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="unit" className="text-white">Unit</Label>
                                            <Input 
                                                id="unit" 
                                                value={tempItem.unit} onChange={e => setTempItem({...tempItem, unit: e.target.value})}
                                                className="bg-indigo-800 text-white border-indigo-700"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="agreed-rate" className="text-white">Agreed Rate</Label>
                                        <Input 
                                            id="agreed-rate" type="number" 
                                            value={tempItem.rate} onChange={e => setTempItem({...tempItem, rate: Number(e.target.value)})}
                                            className="bg-indigo-800 text-white border-indigo-700"
                                        />
                                    </div>
                                    <Button 
                                        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" 
                                        onClick={handleAddItemToVO}
                                        disabled={!tempItem.description || !tempItem.quantityDelta}
                                    >
                                        <Plus className="mr-2 h-4 w-4"/> Stage for Review
                                    </Button>
                                </Card>
                            </div>

                            <div>
                                <Card className="h-full flex flex-col">
                                    <CardHeader className="border-b">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <CardTitle className="flex items-center text-lg font-bold">
                                                    <Receipt className="mr-2 h-5 w-5 text-primary"/> Impact Ledger
                                                </CardTitle>
                                                <p className="text-sm text-muted-foreground">Current staged changes</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-muted-foreground uppercase">TOTAL NET VALUE</p>
                                                <p className="text-3xl font-bold text-primary">
                                                    {formatCurrency(voForm.items?.reduce((acc, i) => acc + (i.quantityDelta * i.rate), 0) || 0, settings)}
                                                </p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 overflow-auto p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead className="text-right">Delta Qty</TableHead>
                                                    <TableHead className="text-right">Rate</TableHead>
                                                    <TableHead className="text-right">Amount</TableHead>
                                                    <TableHead className="text-center"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {voForm.items?.map(item => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            <p className="font-bold line-clamp-1">{item.description}</p>
                                                            <Badge variant="outline" className="text-xs mt-1">
                                                                {item.isNewItem ? 'NON-SCHEDULED' : 'BOQ LINKED'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <p className={`font-bold ${item.quantityDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {item.quantityDelta >= 0 ? '+' : ''}{item.quantityDelta} {item.unit}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="text-right">{formatCurrency(item.rate, settings)}</TableCell>
                                                        <TableCell className="text-right font-bold">
                                                            {currency}{(item.quantityDelta * item.rate).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItemFromVO(item.id)}>
                                                                <X className="h-4 w-4"/>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                    <DialogFooter className="p-4 border-t">
                                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Discard</Button>
                                        <Button 
                                            onClick={handleSaveVODraft}
                                            disabled={!voForm.items?.length || !voForm.title}
                                        >
                                            <Save className="mr-2 h-4 w-4"/> Store Draft
                                        </Button>
                                    </DialogFooter>
                                </Card>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VariationModule;
