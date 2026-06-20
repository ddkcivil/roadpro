import React, { useMemo } from 'react';
import { useInventorySync } from '../../hooks/useInventorySync';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Package, RefreshCw, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from '../../types';

interface InventorySyncModuleProps {
  isAuthenticated: boolean;
  userRole?: string;
}

const InventorySyncModule: React.FC<InventorySyncModuleProps> = ({ isAuthenticated, userRole }) => {
  const {
    transactions,
    stockLevels,
    stockSummary,
    lowStockMaterials,
    syncStatus,
    isLoading,
    error,
    syncNow,
    refresh,
  } = useInventorySync(isAuthenticated, userRole);

  const handleSync = async () => {
    try {
      await syncNow();
      toast.success('Inventory synced successfully');
    } catch (err: any) {
      toast.error(err.message || 'Sync failed');
    }
  };

  // Format currency
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '0.00' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return <Badge variant="default" className="bg-emerald-500"><CheckCircle className="w-3 h-3 mr-1" /> Synced</Badge>;
      case 'syncing':
        return <Badge variant="secondary" className="bg-amber-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Syncing</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  // Low stock materials count
  const lowStockCount = lowStockMaterials?.length || 0;

  return (
    <div className="p-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Material Inventory Sync</h1>
          <p className="text-muted-foreground">External inventory synchronized from central server</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={isLoading || syncStatus.isSyncing}
            className="rounded-xl font-black uppercase tracking-widest text-[10px]"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {userRole === 'Admin' && (
            <Button
              onClick={handleSync}
              disabled={syncStatus.isSyncing}
              className="rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              {syncStatus.isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Now
            </Button>
          )}
        </div>
      </div>

      {/* Sync Status Card */}
      <Card className="rounded-3xl border-none shadow-xl glass mb-6">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-sm font-black uppercase tracking-widest opacity-70">Sync Status</CardTitle>
          {getStatusBadge(syncStatus.isSyncing ? 'Syncing' : (syncStatus.success ? 'Success' : (syncStatus.errors ? 'Error' : 'Idle')))}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-xl bg-muted/30">
              <p className="text-2xl font-black">{syncStatus.totalFetched || 0}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Total Records</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-muted/30">
              <p className="text-2xl font-black text-emerald-500">{syncStatus.inserted || 0}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Inserted</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-muted/30">
              <p className="text-2xl font-black text-amber-500">{syncStatus.updated || 0}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Updated</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-muted/30">
              <p className="text-2xl font-black text-red-500">{syncStatus.errors || 0}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Errors</p>
            </div>
          </div>
          {syncStatus.lastSyncedAt && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Last synced: {formatDate(syncStatus.lastSyncedAt)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="rounded-3xl border-none shadow-xl glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Categories</p>
                <p className="text-2xl font-black">{stockSummary?.totalCategories || 0}</p>
              </div>
              <Package className="h-8 w-8 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-none shadow-xl glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Materials</p>
                <p className="text-2xl font-black">{stockSummary?.totalMaterials || 0}</p>
              </div>
              <Package className="h-8 w-8 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className={`rounded-3xl border-none shadow-xl ${lowStockCount > 0 ? 'glass bg-amber-500/10' : 'glass'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Low Stock</p>
                <p className={`text-2xl font-black ${lowStockCount > 0 ? 'text-amber-500' : ''}`}>{lowStockCount}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${lowStockCount > 0 ? 'text-amber-500' : 'opacity-50'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="rounded-3xl border-none shadow-xl glass">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest opacity-70">Inventory Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin opacity-50" />
              <span className="ml-2 text-muted-foreground">Loading inventory data...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <XCircle className="h-8 w-8 text-red-500" />
              <span className="ml-2 text-red-500">{error}</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 opacity-50 mb-4" />
              <p className="text-muted-foreground">No inventory transactions found.</p>
              <p className="text-xs text-muted-foreground mt-2">Click "Sync Now" to fetch from external server.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Ref No</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 100).map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                    <TableCell className="font-mono text-xs">{formatDate(tx.created_at)}</TableCell>
                    <TableCell className="font-mono text-xs">{tx.ref_no || 'N/A'}</TableCell>
                    <TableCell className="font-bold">{tx.material_detail || tx.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{tx.category || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {tx.recieved_qty || 0}
                      <span className="text-muted-foreground ml-1">{tx.unit || ''}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(tx.rate || 0)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-500">
                      {formatCurrency(tx.amount || tx.total_amount || 0)}
                    </TableCell>
                    <TableCell className="text-xs">{tx.party_name || 'N/A'}</TableCell>
                    <TableCell className="text-xs">{tx.location || tx.branch || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {transactions.length > 100 && (
            <div className="p-4 text-center text-muted-foreground text-xs">
              Showing first 100 of {transactions.length} records
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventorySyncModule;
