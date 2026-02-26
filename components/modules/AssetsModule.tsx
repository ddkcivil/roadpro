import React, { useState, useMemo } from 'react';
import { Project, UserRole, Vehicle } from '../../types';
import QRCodeGenerator from './QRCodeGenerator';
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Package, AlertTriangle, CheckCircle2, TrendingDown, Plus,
    ArrowUpRight, ShoppingCart, History, PackageSearch, Filter,
    FileText, Truck, CreditCard, ChevronRight, Calculator,
    PlusCircle, Trash2, Save, X, Printer, Edit, Car, Fuel, Gauge, Wrench, QrCode
} from 'lucide-react';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const AssetsModule: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Vehicle | null>(null);
  const [assetForm, setAssetForm] = useState<Partial<Vehicle>>({
    plateNumber: '',
    type: '',
    status: 'Active',
    driver: '',
    agencyId: '',
    chainage: '',
    gpsLocation: undefined
  });
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  
  const assets = project.vehicles || [];

  const stats = useMemo(() => {
    const active = assets.filter(a => a.status === 'Active');
    const maintenance = assets.filter(a => a.status === 'Maintenance');
    const idle = assets.filter(a => a.status === 'Idle');
    return { active, maintenance, idle };
  }, [assets]);

  const handleAddAsset = () => {
    setAssetForm({
      plateNumber: '',
      type: '',
      status: 'Active',
      driver: '',
      chainage: ''
    });
    setEditingAssetId(null);
    setIsAssetModalOpen(true);
  };

  const handleEditAsset = (asset: Vehicle) => {
    setAssetForm({
      id: asset.id,
      plateNumber: asset.plateNumber,
      type: asset.type,
      status: asset.status,
      driver: asset.driver,
      agencyId: asset.agencyId || '',
      chainage: asset.chainage,
      gpsLocation: asset.gpsLocation
    });
    setEditingAssetId(asset.id);
    setIsAssetModalOpen(true);
  };

  const canDelete = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER;
  
  const handleDeleteAsset = (assetId: string) => {
    if (!canDelete) {
      alert('Only Admin and Project Manager can delete assets');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    
    const updatedAssets = assets.filter(asset => asset.id !== assetId);
    onProjectUpdate({
      ...project,
      vehicles: updatedAssets
    });
  };

  const handleShowQRCode = (asset: Vehicle) => {
    setSelectedAsset(asset);
    setIsQRModalOpen(true);
  };

  const handleSaveAsset = () => {
    // Validation
    if (!assetForm.plateNumber?.trim()) {
      alert('Plate number is required');
      return;
    }
    
    if (!assetForm.type?.trim()) {
      alert('Asset type is required');
      return;
    }

    if (editingAssetId) {
      // Update existing asset
      const updatedAssets = assets.map(asset => 
        asset.id === editingAssetId 
          ? { 
              ...asset, 
              ...assetForm,
              agencyId: assetForm.agencyId || undefined,
              chainage: assetForm.chainage,
              gpsLocation: assetForm.gpsLocation
            } 
          : asset
      );
      
      onProjectUpdate({
        ...project,
        vehicles: updatedAssets
      });
    } else {
      // Add new asset
      const newAsset: Vehicle = {
        id: `asset-${Date.now()}`,
        name: assetForm.plateNumber || 'Unnamed Asset',
        description: assetForm.type || '',
        category: assetForm.type || 'Equipment',
        unit: 'unit',
        quantity: 1,
        location: assetForm.chainage || 'Site',
        lastUpdated: new Date().toISOString(),
        plateNumber: assetForm.plateNumber,
        type: assetForm.type,
        status: assetForm.status || 'Active',
        driver: assetForm.driver || '',
        agencyId: assetForm.agencyId || undefined,
        chainage: assetForm.chainage,
        gpsLocation: assetForm.gpsLocation
      };
      
      onProjectUpdate({
        ...project,
        vehicles: [...assets, newAsset]
      });
    }
    
    setIsAssetModalOpen(false);
    setAssetForm({
      plateNumber: '',
      type: '',
      status: 'Active',
      driver: '',
      chainage: ''
    });
    setEditingAssetId(null);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between mb-4 items-center">
        <div>
          <h5 className="text-xl font-black">Asset & Equipment Registry</h5>
        </div>
      </div>
    </div>
  );
};

export default AssetsModule;
