import React, { useState, useMemo, useTransition } from 'react';
import { Edit, Trash2, Plus, Search, CheckCircle2 } from 'lucide-react';
import { Project, AppSettings, UserRole, BOQItem } from '../../types';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import { toast } from 'sonner';

// NOTE: This is a refactored version of the BOQManager component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

interface BOQManagerProps {
  project: Project;
  settings: AppSettings;
  onProjectUpdate: (project: Project) => void;
  compactView?: boolean;
}

const BOQRegistry: React.FC<BOQManagerProps> = ({ 
  project, 
  settings, 
  onProjectUpdate,
  compactView = false
}) => {
  const [, startTransition] = useTransition();
  const currencySymbol = getCurrencySymbol(settings.currency);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null);

  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<BOQItem>>({
    itemNo: '',
    description: '',
    unit: '',
    quantity: 0,
    rate: 0,
    location: '',
    category: '',
    completedQuantity: 0,
    variationQuantity: 0,
  });

  const [searchTerm, setSearchTerm] = useState(''); // New state for search term
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const handleEditClick = (item: BOQItem) => {
    setEditingItem({ ...item }); // Create a copy to edit
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingItem) {
      const { name, value } = e.target;
      setEditingItem(prev => ({
        ...(prev as BOQItem),
        [name]: (name === 'quantity' || name === 'rate' || name === 'completedQuantity' || name === 'variationQuantity') ? Number(value) : value,
      }));
    }
  };

  const handleSaveEdit = () => {
    if (editingItem && project) {
      const updatedBoq = project.boq.map(item =>
        item.id === editingItem.id ? editingItem : item
      );
      startTransition(() => {
        onProjectUpdate({ ...project, boq: updatedBoq });
      });
      setIsEditModalOpen(false);
      setEditingItem(null);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  const handleAddNewItemClick = () => {
    setIsNewItemModalOpen(true);
  };

  const handleNewItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: (name === 'quantity' || name === 'rate') ? Number(value) : value,
    }));
  };

  const handleSaveNewItem = () => {
    if (newItem.description && newItem.quantity !== undefined && newItem.rate !== undefined && project) {
      const newBoqItem: BOQItem = {
        id: `boq-${Date.now()}`, // Simple unique ID generation
        itemNo: newItem.itemNo || `ITEM-${(project.boq?.length || 0) + 1}`,
        description: newItem.description,
        unit: newItem.unit || 'unit',
        quantity: newItem.quantity,
        rate: newItem.rate,
        amount: newItem.quantity * newItem.rate, // Calculated amount
        location: newItem.location || 'N/A',
        category: newItem.category || 'General',
        completedQuantity: 0,
        variationQuantity: 0,
      };
      startTransition(() => {
        onProjectUpdate({ ...project, boq: [...(project.boq || []), newBoqItem] });
      });
      setIsNewItemModalOpen(false);
      setNewItem({ // Reset form
        itemNo: '', description: '', unit: '', quantity: 0, rate: 0,
        location: '', category: '', completedQuantity: 0, variationQuantity: 0,
      });
    }
  };

  const handleCloseNewItemModal = () => {
    setIsNewItemModalOpen(false);
    setNewItem({ // Reset form
      itemNo: '', description: '', unit: '', quantity: 0, rate: 0,
      location: '', category: '', completedQuantity: 0, variationQuantity: 0,
    });
  };

  const handleDeleteClick = (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this BOQ item?')) {
      if (project) {
        const updatedBoq = project.boq.filter(item => item.id !== itemId);
        startTransition(() => {
          onProjectUpdate({ ...project, boq: updatedBoq });
        });
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCertifyCompletion = (item: BOQItem) => {
    if (window.confirm(`Certify 100% completion for item ${item.itemNo}?`)) {
      const totalQty = item.quantity + (item.variationQuantity || 0);
      const updatedBoq = project.boq.map(b =>
        b.id === item.id ? { ...b, completedQuantity: totalQty, status: 'Completed' as const } : b
      );
      startTransition(() => {
        onProjectUpdate({ ...project, boq: updatedBoq });
      });
      toast.success(`Item ${item.itemNo} certified as completed.`);
    }
  };

  const filteredBoq = useMemo(() => {
    if (!project.boq) return [];
    if (!searchTerm) return project.boq;

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return project.boq.filter(item =>
      item.itemNo.toLowerCase().includes(lowerCaseSearchTerm) ||
      item.description.toLowerCase().includes(lowerCaseSearchTerm) ||
      item.unit.toLowerCase().includes(lowerCaseSearchTerm) ||
      item.location.toLowerCase().includes(lowerCaseSearchTerm) ||
      item.category.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [project.boq, searchTerm]);


  const paginatedBoq = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBoq.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBoq, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredBoq.length / itemsPerPage);

  return (
    <div className={cn("p-4", compactView ? "p-1" : "p-3")}>
      <div className="flex justify-between items-center mb-4">
        <div>
            <h2 className="text-xl font-bold">BOQ Registry</h2>
            <p className="text-xs text-muted-foreground">Showing {Math.min(filteredBoq.length, itemsPerPage)} of {filteredBoq.length} items</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search BOQ..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-64 pl-10"
            />
          </div>
          <Button onClick={handleAddNewItemClick}>
            <Plus className="mr-2 h-4 w-4" /> Add New Item
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="font-bold">Item No</TableHead>
                <TableHead className="font-bold">Description</TableHead>
                <TableHead className="font-bold">Unit</TableHead>
                <TableHead className="text-right font-bold">Quantity</TableHead>
                <TableHead className="text-right font-bold">Rate ({currencySymbol})</TableHead>
                <TableHead className="text-right font-bold">Amount ({currencySymbol})</TableHead>
                <TableHead className="font-bold">Progress</TableHead>
                <TableHead className="text-right font-bold">Completed</TableHead>                <TableHead className="text-right font-bold">Variation</TableHead>
                <TableHead className="text-center font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBoq.length > 0 ? (
                paginatedBoq.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.itemNo}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{(item.quantity || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{(item.rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">{((item.quantity || 0) * (item.rate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    {/* New Progress Cell */}
                    <TableCell className="text-center"> {/* Centered for progress bar */}
                      {(() => {
                        const totalQuantity = (item.quantity || 0) + (item.variationQuantity || 0);
                        const progress = totalQuantity > 0 ? (item.completedQuantity || 0) / totalQuantity * 100 : 0;
                        const clampedProgress = Math.min(progress, 100);

                        return (
                          <div className="w-full">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                              <div 
                                className="bg-primary h-2.5 rounded-full transition-all duration-500" 
                                style={{ width: `${clampedProgress}%` }}
                                title={`${clampedProgress.toFixed(1)}%`}
                              ></div>
                            </div>
                            <span className="text-xs text-muted-foreground">{clampedProgress.toFixed(1)}%</span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">{item.completedQuantity?.toLocaleString() || '0'}</TableCell>
                    <TableCell className="text-right">{item.variationQuantity?.toLocaleString() || '0'}</TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-green-600 hover:text-green-700" 
                              onClick={() => handleCertifyCompletion(item)}
                              disabled={item.completedQuantity >= (item.quantity + (item.variationQuantity || 0))}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Certify 100% Completion</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Item</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete Item</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground">No matching BOQ items found.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit BOQ Item Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit BOQ Item</DialogTitle>
            <DialogDescription>Make changes to the BOQ item here.</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="itemNo" className="text-right">Item No</Label>
                <Input id="itemNo" name="itemNo" value={editingItem.itemNo} onChange={handleEditChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Input id="description" name="description" value={editingItem.description} onChange={handleEditChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unit" className="text-right">Unit</Label>
                <Input id="unit" name="unit" value={editingItem.unit} onChange={handleEditChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" value={editingItem.quantity} onChange={handleEditChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rate" className="text-right">Rate</Label>
                <Input id="rate" name="rate" type="number" value={editingItem.rate} onChange={handleEditChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="completedQuantity" className="text-right">Completed Quantity</Label>
                <Input id="completedQuantity" name="completedQuantity" type="number" value={editingItem.completedQuantity || 0} onChange={handleEditChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="variationQuantity" className="text-right">Variation Quantity</Label>
                <Input id="variationQuantity" name="variationQuantity" type="number" value={editingItem.variationQuantity || 0} onChange={handleEditChange} className="col-span-3" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditModal}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New BOQ Item Dialog */}
      <Dialog open={isNewItemModalOpen} onOpenChange={setIsNewItemModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New BOQ Item</DialogTitle>
            <DialogDescription>Enter details for the new BOQ item.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newItemNo" className="text-right">Item No</Label>
              <Input id="newItemNo" name="itemNo" value={newItem.itemNo} onChange={handleNewItemChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newDescription" className="text-right">Description</Label>
              <Input id="newDescription" name="description" value={newItem.description} onChange={handleNewItemChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newUnit" className="text-right">Unit</Label>
              <Input id="newUnit" name="unit" value={newItem.unit} onChange={handleNewItemChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newQuantity" className="text-right">Quantity</Label>
              <Input id="newQuantity" name="quantity" type="number" value={newItem.quantity} onChange={handleNewItemChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newRate" className="text-right">Rate</Label>
              <Input id="newRate" name="rate" type="number" value={newItem.rate} onChange={handleNewItemChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newLocation" className="text-right">Location</Label>
              <Input id="newLocation" name="location" value={newItem.location} onChange={handleNewItemChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newCategory" className="text-right">Category</Label>
              <Input id="newCategory" name="category" value={newItem.category} onChange={handleNewItemChange} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseNewItemModal}>Cancel</Button>
            <Button onClick={handleSaveNewItem} disabled={!newItem.description || newItem.quantity === undefined || newItem.rate === undefined}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BOQRegistry;
