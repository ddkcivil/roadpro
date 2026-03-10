import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api/apiService';
import { useAuth } from '../../hooks/useAuth';
import { AuditLog, UserRole } from '../../types';
import { 
  Search, 
  RefreshCcw, 
  Filter, 
  FileText, 
  User, 
  Calendar,
  Activity,
  ArrowRight,
  Info
} from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';

const UserActivity: React.FC = () => {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  
  // Filters
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('all');
  const [entityType, setEntityType] = useState('');
  
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const filters: any = {
        limit,
        offset: page * limit
      };
      if (userId) filters.userId = userId;
      if (action !== 'all') filters.action = action;
      if (entityType) filters.entityType = entityType;

      const result = await apiService.getAuditLogs(filters);
      
      // Secondary filter for DELETE actions if not privileged
      let filteredLogs = result.logs;
      if (userRole !== UserRole.ADMIN && userRole !== UserRole.PROJECT_MANAGER) {
        filteredLogs = result.logs.filter((log: AuditLog) => log.action !== 'DELETE');
      }

      setLogs(filteredLogs);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, action]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchLogs();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-600 text-white';
      case 'WARNING': return 'bg-amber-500 text-white';
      case 'ERROR': return 'bg-red-500 text-white';
      default: return 'bg-blue-500/20 text-blue-700';
    }
  };

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="p-4 h-[calc(100vh-140px)] overflow-y-auto">
      <div className="flex justify-between mb-4 items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="text-primary h-6 w-6" />
            User Activity & Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground">Track all system actions and modifications</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs()} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">User ID / Name</label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by user..." 
                  value={userId} 
                  onChange={e => setUserId(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="w-48 space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">Action Type</label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                  <SelectItem value="CREATE">Add</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="SAVE">Save</SelectItem>
                  <SelectItem value="UPLOAD">Upload</SelectItem>
                  {(userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER) && (
                    <SelectItem value="DELETE">Delete</SelectItem>
                  )}
                  <SelectItem value="APPROVE">Approve</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px] space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">Entity Type</label>
              <div className="relative">
                <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="e.g. project, user, rfi..." 
                  value={entityType} 
                  onChange={e => setEntityType(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
            
            <Button type="button" variant="ghost" onClick={() => {
              setUserId('');
              setAction('all');
              setEntityType('');
              setPage(0);
            }}>
              Clear
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <RefreshCcw className="h-6 w-6 animate-spin mx-auto opacity-20" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No activity logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedLog(log)}>
                    <TableCell className="text-xs font-medium">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{log.userName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{log.userId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-black text-[10px] tracking-widest uppercase border-primary/20 text-primary">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold capitalize">{log.entityType}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                          {log.entityName || log.entityId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getSeverityColor(log.severity)} text-[9px] font-bold px-1.5 py-0`}>
                        {log.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Info className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {logs.length} of {total} logs
        </p>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 0 || loading} 
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={(page + 1) * limit >= total || loading} 
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="text-primary" /> Log Entry Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 p-3 rounded-xl">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">User Info</p>
                  <p className="font-bold">{selectedLog.userName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedLog.userId}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-xl">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Event Time</p>
                  <p className="font-bold">{formatTimestamp(selectedLog.timestamp)}</p>
                  <p className="text-xs text-muted-foreground">ISO: {selectedLog.timestamp}</p>
                </div>
              </div>

              <div className="bg-muted/30 p-3 rounded-xl">
                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Action & Entity</p>
                <div className="flex items-center gap-3">
                  <Badge className="font-black uppercase tracking-widest">{selectedLog.action}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold capitalize">{selectedLog.entityType}</span>
                  <span className="text-muted-foreground">({selectedLog.entityName || selectedLog.entityId})</span>
                </div>
              </div>

              {(selectedLog.oldValue || selectedLog.newValue) && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Data Changes</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-border/50 rounded-xl p-3 bg-red-50/10">
                      <p className="text-[10px] font-bold text-red-600 uppercase mb-2">Previous State</p>
                      <pre className="text-[10px] overflow-auto max-h-[200px] whitespace-pre-wrap">
                        {selectedLog.oldValue ? JSON.stringify(selectedLog.oldValue, null, 2) : 'None'}
                      </pre>
                    </div>
                    <div className="border border-border/50 rounded-xl p-3 bg-green-50/10">
                      <p className="text-[10px] font-bold text-green-600 uppercase mb-2">New State</p>
                      <pre className="text-[10px] overflow-auto max-h-[200px] whitespace-pre-wrap">
                        {selectedLog.newValue ? JSON.stringify(selectedLog.newValue, null, 2) : 'None'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Technical Metadata</p>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-[10px] overflow-auto max-h-[200px]">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserActivity;
