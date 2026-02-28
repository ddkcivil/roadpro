import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  FileText, 
  MapPin, 
  Truck, 
  Users, 
  ClipboardCheck, 
  FolderOpen,
  ArrowRight,
  Command,
  X,
  Star,
  History,
  Trash2
} from 'lucide-react';
import { Dialog, DialogContent } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Button } from '~/components/ui/button';
import { Project, UserRole } from '../../types';
import { cn } from '~/lib/utils';

interface GlobalSearchProps {
  projects: Project[];
  currentProject?: Project;
  onSelectProject: (id: string) => void;
  onNavigate: (tabId: string) => void;
  userRole: UserRole;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'Project' | 'Structure' | 'RFI' | 'Vehicle' | 'Document' | 'BOQ';
  tabId: string;
  icon: any;
  projectId?: string;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ 
  projects, 
  currentProject, 
  onSelectProject, 
  onNavigate,
  userRole 
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // History and Favorites state
  const [history, setHistory] = useState<SearchResult[]>(() => {
    const saved = localStorage.getItem('roadmaster-search-history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [favorites, setFavorites] = useState<SearchResult[]>(() => {
    const saved = localStorage.getItem('roadmaster-search-favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('roadmaster-search-history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('roadmaster-search-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addToHistory = useCallback((result: SearchResult) => {
    setHistory(prev => {
      const filtered = prev.filter(item => item.id !== result.id || item.type !== result.type);
      return [result, ...filtered].slice(0, 5); // Keep last 5
    });
  }, []);

  const toggleFavorite = useCallback((e: React.MouseEvent, result: SearchResult) => {
    e.stopPropagation();
    setFavorites(prev => {
      const isFav = prev.some(item => item.id === result.id && item.type === result.type);
      if (isFav) {
        return prev.filter(item => item.id !== result.id || item.type !== result.type);
      }
      return [result, ...prev];
    });
  }, []);

  const clearHistory = () => setHistory([]);

  // Toggle search with Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    
    const searchResults: SearchResult[] = [];
    const q = query.toLowerCase();

    // 1. Search Projects
    projects.forEach(p => {
      if (p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) {
        searchResults.push({
          id: p.id,
          title: p.name,
          subtitle: `Project Code: ${p.code}`,
          type: 'Project',
          tabId: 'dashboard',
          icon: MapPin
        });
      }
    });

    // 2. Search within current project if selected
    if (currentProject) {
      // Structures
      currentProject.structures?.forEach(s => {
        if (s.name.toLowerCase().includes(q)) {
          searchResults.push({
            id: s.id,
            title: s.name,
            subtitle: `Structure • ${s.type} • ${s.chainage}`,
            type: 'Structure',
            tabId: 'construction',
            icon: ArrowRight,
            projectId: currentProject.id
          });
        }
      });

      // RFIs
      currentProject.rfis?.forEach(r => {
        if (r.subject?.toLowerCase().includes(q) || r.rfiNo.toLowerCase().includes(q)) {
          searchResults.push({
            id: r.id,
            title: r.rfiNo,
            subtitle: `RFI • ${r.subject}`,
            type: 'RFI',
            tabId: 'rfis',
            icon: ClipboardCheck,
            projectId: currentProject.id
          });
        }
      });

      // Vehicles
      currentProject.vehicles?.forEach(v => {
        if (v.name.toLowerCase().includes(q) || v.plateNumber.toLowerCase().includes(q)) {
          searchResults.push({
            id: v.id,
            title: v.name || v.plateNumber,
            subtitle: `Vehicle • ${v.type} • ${v.status}`,
            type: 'Vehicle',
            tabId: 'fleet',
            icon: Truck,
            projectId: currentProject.id
          });
        }
      });

      // Documents
      currentProject.documents?.forEach(d => {
        if (d.name.toLowerCase().includes(q)) {
          searchResults.push({
            id: d.id,
            title: d.name,
            subtitle: `Document • ${d.folder}`,
            type: 'Document',
            tabId: 'documents',
            icon: FolderOpen,
            projectId: currentProject.id
          });
        }
      });
    }

    return searchResults.slice(0, 10); // Limit to 10 results
  }, [query, projects, currentProject]);

  const handleSelect = useCallback((result: SearchResult) => {
    addToHistory(result);
    if (result.type === 'Project') {
      onSelectProject(result.id);
    } else {
      onNavigate(result.tabId);
    }
    setOpen(false);
    setQuery('');
  }, [onSelectProject, onNavigate, addToHistory]);

  // Keyboard navigation for results
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selectedIndex, handleSelect]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-2xl border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center border-b px-4 bg-slate-50/50 dark:bg-slate-800/50">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            className="flex-1 border-none focus-visible:ring-0 text-lg h-14 bg-transparent"
            placeholder="Search projects, structures, RFIs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="hidden sm:flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">ESC</span>
          </kbd>
        </div>
        
        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            {results.length > 0 ? (
              <div className="space-y-1">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group",
                      selectedIndex === index 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.01]" 
                        : "hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                    onClick={() => handleSelect(result)}
                  >
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      selectedIndex === index ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700"
                    )}>
                      <result.icon size={18} className={selectedIndex === index ? "text-white" : "text-slate-500"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate text-sm">{result.title}</span>
                        <Badge variant={selectedIndex === index ? "outline" : "secondary"} className={cn(
                          "text-[10px] px-1.5 h-4 font-black uppercase tracking-widest",
                          selectedIndex === index && "border-white/40 text-white"
                        )}>
                          {result.type}
                        </Badge>
                      </div>
                      <p className={cn(
                        "text-[11px] truncate mt-0.5 font-medium",
                        selectedIndex === index ? "text-white/70" : "text-slate-500"
                      )}>
                        {result.subtitle}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn("h-8 w-8 hover:bg-white/20", selectedIndex === index ? "text-white" : "text-slate-400")}
                      onClick={(e) => toggleFavorite(e, result)}
                    >
                      <Star size={14} className={cn(favorites.some(f => f.id === result.id) && "fill-yellow-400 text-yellow-400")} />
                    </Button>
                    <ArrowRight size={14} className={cn(
                      "shrink-0 transition-transform duration-200",
                      selectedIndex === index ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                    )} />
                  </button>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="p-8 text-center">
                <Command className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No results found for "{query}"</p>
              </div>
            ) : (
              <div className="p-2 space-y-4">
                {favorites.length > 0 && (
                  <div>
                    <p className="px-2 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Star size={10} className="text-yellow-500" /> Favorites
                    </p>
                    <div className="space-y-1">
                      {favorites.map((fav) => (
                        <button
                          key={`fav-${fav.id}`}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          onClick={() => handleSelect(fav)}
                        >
                          <fav.icon size={14} className="text-slate-400" />
                          <span className="text-sm font-medium flex-1 truncate">{fav.title}</span>
                          <Badge variant="secondary" className="text-[9px] h-4">{fav.type}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {history.length > 0 && (
                  <div>
                    <div className="px-2 mb-2 flex justify-between items-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <History size={10} /> Recent Searches
                      </p>
                      <button onClick={clearHistory} className="text-[9px] font-bold text-red-500 hover:underline flex items-center gap-1">
                        <Trash2 size={10} /> Clear
                      </button>
                    </div>
                    <div className="space-y-1">
                      {history.map((hist) => (
                        <button
                          key={`hist-${hist.id}`}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          onClick={() => handleSelect(hist)}
                        >
                          <hist.icon size={14} className="text-slate-400" />
                          <span className="text-sm font-medium flex-1 truncate">{hist.title}</span>
                          <Badge variant="outline" className="text-[9px] h-4">{hist.type}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Keyboard Shortcuts</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Open Search</span>
                        <kbd className="px-1.5 py-0.5 rounded border bg-white shadow-sm font-mono font-bold">Ctrl+K</kbd>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Navigate</span>
                        <kbd className="px-1.5 py-0.5 rounded border bg-white shadow-sm font-mono font-bold">↑↓</kbd>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Select</span>
                        <kbd className="px-1.5 py-0.5 rounded border bg-white shadow-sm font-mono font-bold">Enter</kbd>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">Search Tips</p>
                    <p className="text-[11px] text-indigo-600/80 leading-relaxed font-medium">
                      Search for project codes, structure names, or RFI numbers across your entire portfolio.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-3 border-t bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5"><ArrowRight size={10} className="rotate-90" /> Navigate</span>
            <span className="flex items-center gap-1.5"><ArrowRight size={10} /> Select</span>
          </div>
          <span>RoadMaster Pro Search</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
