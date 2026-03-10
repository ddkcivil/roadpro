import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudCog, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { SyncService } from '../../services/api/syncService';
import { SyncOperation } from '../../types';
import { Button } from '~/components/ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '~/components/ui/popover';
import { Badge } from '~/components/ui/badge';
import { ScrollArea } from '~/components/ui/scroll-area';
import { cn } from '~/lib/utils';

/**
 * A comprehensive offline indicator and sync status manager.
 * Shows online/offline status and a queue of pending operations.
 */
export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<SyncOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const updateQueue = async () => {
    const q = await SyncService.getQueue();
    setQueue(q);
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Poll queue status every 30 seconds
    const interval = setInterval(updateQueue, 30000);
    updateQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline || isSyncing || queue.length === 0) return;
    setIsSyncing(true);
    await SyncService.processQueue();
    await updateQueue();
    setIsSyncing(false);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-10 gap-2 px-3 transition-all rounded-xl",
            !isOnline ? "text-destructive hover:text-destructive hover:bg-destructive/10" : "text-muted-foreground"
          )}
        >
          {isOnline ? (
            <div className="relative">
              <Wifi size={18} className="text-emerald-500" />
              {queue.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full border-2 border-background animate-pulse" />
              )}
            </div>
          ) : (
            <WifiOff size={18} />
          )}
          
          <div className="flex flex-col items-start leading-none hidden sm:flex">
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {queue.length > 0 ? (
              <span className="text-[9px] font-bold text-amber-600 uppercase">
                {queue.length} Pending
              </span>
            ) : (
              <span className="text-[9px] font-bold text-emerald-600 uppercase">
                Synced
              </span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-2xl border-border/50 rounded-2xl overflow-hidden" align="end">
        <div className="p-4 bg-muted/30 border-b flex justify-between items-center">
          <div>
            <h4 className="font-bold text-sm">Synchronization Center</h4>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {isOnline ? 'Connected to Cloud' : 'Disconnected - Local Mode'}
            </p>
          </div>
          {isOnline && queue.length > 0 && (
            <Button 
              size="sm" 
              className="h-8 text-[10px] font-bold" 
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? <Loader2 size={12} className="animate-spin mr-1" /> : <RefreshCw size={12} className="mr-1" />}
              SYNC NOW
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[300px]">
          {queue.length > 0 ? (
            <div className="p-2 space-y-1">
              {queue.map((op) => (
                <div key={op.id} className="p-3 rounded-xl border border-border/40 bg-card/50 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted shrink-0">
                    <CloudCog size={14} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="text-xs font-bold truncate">{op.description}</p>
                      <Badge variant="outline" className="text-[8px] h-3 px-1">{op.method}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{op.endpoint}</p>
                    {op.retries > 0 && (
                      <p className="text-[9px] text-destructive font-bold mt-1 uppercase">
                        Retry Attempt {op.retries}/5
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <p className="text-sm font-bold">All data synchronized</p>
              <p className="text-xs text-muted-foreground mt-1">Your local changes match the cloud.</p>
            </div>
          )}
        </ScrollArea>

        {!isOnline && (
          <div className="p-3 bg-destructive/5 border-t border-destructive/10 flex items-center gap-2">
            <AlertCircle size={14} className="text-destructive" />
            <p className="text-[10px] font-bold text-destructive uppercase">
              Changes are saved locally and will sync when online.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
