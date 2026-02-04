import React, { useState, useMemo } from 'react'; // Added useMemo
import { 
  Box, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Tooltip, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, InputAdornment // Added InputAdornment
} from '@mui/material';
import { Edit, Trash2, Plus, Save, X, Search } from 'lucide-react'; // Added Search icon
import { Project, AppSettings, UserRole, BOQItem } from '../../types';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

interface BOQManagerProps {
  project: Project;
  settings: AppSettings;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
  compactView?: boolean;
}

const BOQManager: React.FC<BOQManagerProps> = ({ 
  project, 
  settings, 
  userRole, 
  onProjectUpdate,
  compactView = false
}) => {
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
      onProjectUpdate({ ...project, boq: updatedBoq });
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
      onProjectUpdate({ ...project, boq: [...(project.boq || []), newBoqItem] });
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
        onProjectUpdate({ ...project, boq: updatedBoq });
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
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

  return (
    <Box sx={{ p: compactView ? 1 : 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold">BOQ Registry</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <TextField
            label="Search BOQ"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} />
                </InputAdornment>
              ),
            }}
          />
          <Button 
            variant="contained" 
            startIcon={<Plus size={16}/>} 
            sx={{ borderRadius: 2, paddingX: 1.5, paddingY: 0.75 }}
            onClick={handleAddNewItemClick}
          >
            Add New Item
          </Button>
        </Box>
      </Box>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size={compactView ? "small" : "medium"}>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Item No</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Unit</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Rate ({currencySymbol})</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount ({currencySymbol})</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Completed</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Variation</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBoq && filteredBoq.length > 0 ? ( 
              filteredBoq.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.itemNo}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell align="right">{item.quantity.toLocaleString()}</TableCell>
                  <TableCell align="right">{item.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">{(item.quantity * item.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">{item.completedQuantity?.toLocaleString() || '0'}</TableCell>
                  <TableCell align="right">{item.variationQuantity?.toLocaleString() || '0'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit Item">
                      <IconButton size="small" color="primary" onClick={() => handleEditClick(item)}>
                        <Edit size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Item">
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(item.id)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', py: 5 }}>
                  <Typography variant="body2" color="text.secondary">No matching BOQ items found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit BOQ Item Dialog */}
      <Dialog open={isEditModalOpen} onClose={handleCloseEditModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider' }}>Edit BOQ Item</DialogTitle>
        <DialogContent>
          {editingItem && (
            <Grid container spacing={2} mt={2}>
              <Grid item xs={12}><TextField fullWidth label="Item No" name="itemNo" value={editingItem.itemNo} onChange={handleEditChange} size="small" /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Description" name="description" value={editingItem.description} onChange={handleEditChange} size="small" multiline rows={2} /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Unit" name="unit" value={editingItem.unit} onChange={handleEditChange} size="small" /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Quantity" name="quantity" type="number" value={editingItem.quantity} onChange={handleEditChange} size="small" /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Rate" name="rate" type="number" value={editingItem.rate} onChange={handleEditChange} size="small" /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Completed Quantity" name="completedQuantity" type="number" value={editingItem.completedQuantity || 0} onChange={handleEditChange} size="small" /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Variation Quantity" name="variationQuantity" type="number" value={editingItem.variationQuantity || 0} onChange={handleEditChange} size="small" /></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={handleCloseEditModal}>Cancel</Button>
          <Button variant="contained" startIcon={<Save size={18}/>} onClick={handleSaveEdit}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Add New BOQ Item Dialog */}
      <Dialog open={isNewItemModalOpen} onClose={handleCloseNewItemModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider' }}>Add New BOQ Item</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={2}>
            <Grid item xs={12}><TextField fullWidth label="Item No" name="itemNo" value={newItem.itemNo} onChange={handleNewItemChange} size="small" /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Description" name="description" value={newItem.description} onChange={handleNewItemChange} size="small" multiline rows={2} required /></Grid>
            <Grid item xs={4}><TextField fullWidth label="Unit" name="unit" value={newItem.unit} onChange={handleNewItemChange} size="small" /></Grid>
            <Grid item xs={4}><TextField fullWidth label="Quantity" name="quantity" type="number" value={newItem.quantity} onChange={handleNewItemChange} size="small" required /></Grid>
            <Grid item xs={4}><TextField fullWidth label="Rate" name="rate" type="number" value={newItem.rate} onChange={handleNewItemChange} size="small" required /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Location" name="location" value={newItem.location} onChange={handleNewItemChange} size="small" /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Category" name="category" value={newItem.category} onChange={handleNewItemChange} size="small" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={handleCloseNewItemModal}>Cancel</Button>
          <Button variant="contained" startIcon={<Plus size={18}/>} onClick={handleSaveNewItem} disabled={!newItem.description || newItem.quantity === undefined || newItem.rate === undefined}>Add Item</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BOQManager;