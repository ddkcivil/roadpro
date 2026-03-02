import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    Camera, Upload, Search, Filter, Sparkles, Trash2,
    Calendar, MapPin, X,
    HardHat, History, Wifi, WifiOff
} from 'lucide-react';
import { Project, SitePhoto, UserRole } from '../../types';
import { analyzeSitePhoto } from '../../services/ai/geminiService';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Badge } from '~/components/ui/badge';
import { toast } from 'sonner';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const PHOTO_CATEGORIES = ['General', 'Earthwork', 'Structures', 'Pavement', 'Safety'] as const;

const SitePhotosModule: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState<SitePhoto | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Update online status when it changes
    useEffect(() => {
        const handleOnlineStatusChange = () => {
            setIsOnline(navigator.onLine);
        };

        window.addEventListener('online', handleOnlineStatusChange);
        window.addEventListener('offline', handleOnlineStatusChange);

        return () => {
            window.removeEventListener('online', handleOnlineStatusChange);
            window.removeEventListener('offline', handleOnlineStatusChange);
        };
    }, []);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadForm, setUploadForm] = useState<Partial<SitePhoto>>({
        category: 'General',
        caption: '',
        location: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [tempFile, setTempFile] = useState<File | null>(null);
    const [tempPreview, setTempPreview] = useState<string | null>(null);

    // Clean up temporary preview URL when component unmounts or when a new file is selected
    useEffect(() => {
        return () => {
            if (tempPreview && tempPreview.startsWith('blob:')) {
                URL.revokeObjectURL(tempPreview);
            }
        };
    }, [tempPreview]);

    const sitePhotos = project.sitePhotos || [];

    const filteredPhotos = useMemo(() => {
        return sitePhotos.filter(p =>
            (categoryFilter === 'All' || p.category === categoryFilter) &&
            ((p.caption || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
             (p.location || '').toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sitePhotos, categoryFilter, searchTerm]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setTempFile(file);
            setTempPreview(URL.createObjectURL(file));
        }
    };

    const handleSavePhoto = async () => {
        if (!tempPreview || !tempFile) return;

        const uploadToast = toast.loading("Saving photo to log...");

        try {
            // Convert the temporary blob URL to base64 data to store permanently
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    resolve(result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(tempFile);
            });

            const newPhoto: SitePhoto = {
                id: `img-${Date.now()}`,
                url: base64Data, // Store as base64 data URL
                date: uploadForm.date!,
                caption: uploadForm.caption || 'Site Photo',
                location: uploadForm.location || 'Not Specified',
                category: uploadForm.category as any,
                isAnalyzed: false
            };

            onProjectUpdate({
                ...project,
                sitePhotos: [...sitePhotos, newPhoto]
            });
            
            toast.dismiss(uploadToast);
            toast.success("Photo Logged", { description: "The observation has been saved." });
            setUploadModalOpen(false);
            setTempFile(null);
            setTempPreview(null);
            setUploadForm({
                category: 'General',
                caption: '',
                location: '',
                date: new Date().toISOString().split('T')[0]
            });
        } catch (error) {
            toast.dismiss(uploadToast);
            toast.error("Failed to save photo");
            console.error(error);
        }
    };

    const handleAnalyze = async (photo: SitePhoto) => {
        setIsAnalyzing(true);
        const analysisToast = toast.loading("AI Auditor analyzing site conditions...");
        
        try {
            // Call Gemini AI for real image analysis
            const analysis = await analyzeSitePhoto(photo.url, photo.category);
            
            const updatedPhotos = project.sitePhotos?.map(p =>
                p.id === photo.id ? { ...p, aiAnalysis: analysis, isAnalyzed: true } : p
            );
            
            onProjectUpdate({ ...project, sitePhotos: updatedPhotos });
            
            if (previewPhoto?.id === photo.id) {
                setPreviewPhoto(prev => prev ? { ...prev, aiAnalysis: analysis, isAnalyzed: true } : null);
            }
            
            toast.dismiss(analysisToast);
            toast.success("Analysis Complete");
        } catch (error) {
            console.error("Analysis failed", error);
            toast.dismiss(analysisToast);
            toast.error("Analysis Failed", { description: (error as Error).message });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const canDelete = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER;

    const handleDeletePhoto = (id: string) => {
        if (!canDelete) {
            toast.error('Permission Denied', { description: 'Only Admin and Project Manager can delete photos' });
            return;
        }

        if (confirm("Delete this site photo permanently?")) {
            onProjectUpdate({ ...project, sitePhotos: sitePhotos.filter(p => p.id !== id) });
            toast.success("Photo Deleted");
        }
    };

    return (
        <div className="animate-in fade-in duration-500 h-full flex flex-col">
            <div className="flex justify-between mb-4 items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-black">Visual Intelligence</h1>
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Site surveillance & AI monitoring</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setUploadModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 font-bold">
                        <Camera className="w-4 h-4 mr-2" />
                        Capture Update
                    </Button>
                    <Badge variant={isOnline ? "success" : "destructive" as any} className="flex items-center gap-1.5 h-10 px-4 rounded-xl">
                        {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                        {isOnline ? "SYSTEM ONLINE" : "OFFLINE MODE"}
                    </Badge>
                </div>
            </div>

            <Card className="p-4 mb-6 shrink-0 border-2">
                <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search captions, locations..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 font-medium"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={categoryFilter === 'All' ? 'default' : 'outline'}
                            size="sm"
                            className="font-bold"
                            onClick={() => setCategoryFilter('All')}
                        >
                            All
                        </Button>
                        {PHOTO_CATEGORIES.map(cat => (
                            <Button
                                key={cat}
                                variant={categoryFilter === cat ? 'default' : 'outline'}
                                size="sm"
                                className="font-bold"
                                onClick={() => setCategoryFilter(cat)}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>
                </div>
            </Card>

            <div className="flex-1 overflow-y-auto">
                {filteredPhotos.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl text-muted-foreground">
                        <Camera size={48} className="mb-4 opacity-20" />
                        <p className="font-bold">No site photos found</p>
                        <p className="text-sm">Upload your first field observation to begin AI analysis</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-10">
                        {filteredPhotos.map(photo => (
                            <Card
                                key={photo.id}
                                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 overflow-hidden group"
                                onClick={() => setPreviewPhoto(photo)}
                            >
                                <div className="aspect-video overflow-hidden relative">
                                    <img
                                        src={photo.url}
                                        alt={photo.caption}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    {photo.isAnalyzed && (
                                        <div className="absolute top-2 right-2 bg-indigo-600 text-white p-1 rounded-lg shadow-lg">
                                            <Sparkles size={14} />
                                        </div>
                                    )}
                                </div>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <Badge variant="outline" className="font-bold">{photo.category}</Badge>
                                        <div className="flex items-center gap-1 text-[10px] font-black text-muted-foreground uppercase">
                                            <Calendar className="w-3 h-3" />
                                            {photo.date}
                                        </div>
                                    </div>
                                    <h3 className="font-black text-slate-900 mb-1 truncate">{photo.caption}</h3>
                                    <div className="flex items-center gap-1 text-xs font-bold text-slate-500 uppercase">
                                        <MapPin className="w-3 h-3" />
                                        {photo.location}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-indigo-600 text-white">
                        <DialogTitle className="text-xl font-black">Record Field Observation</DialogTitle>
                        <DialogDescription className="text-indigo-100 font-medium">Capture site progress and safety conditions.</DialogDescription>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        <div
                            className="h-48 border-4 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all overflow-hidden group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {tempPreview ? (
                                <img src={tempPreview} className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-black text-slate-600 uppercase tracking-tight">Select Site Image</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">JPG, PNG up to 10MB</p>
                                </>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                hidden
                                accept="image/*"
                                onChange={handleFileSelect}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="caption" className="font-black text-[10px] uppercase tracking-widest text-slate-500">Observation Caption</Label>
                            <Input
                                id="caption"
                                value={uploadForm.caption}
                                onChange={e => setUploadForm({...uploadForm, caption: e.target.value})}
                                className="rounded-xl border-2 font-bold"
                                placeholder="e.g., Piling work progress at Ch 12+400"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="location" className="font-black text-[10px] uppercase tracking-widest text-slate-500">Location</Label>
                                <Input
                                    id="location"
                                    value={uploadForm.location}
                                    onChange={e => setUploadForm({...uploadForm, location: e.target.value})}
                                    className="rounded-xl border-2 font-bold"
                                    placeholder="Chainage/Area"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category" className="font-black text-[10px] uppercase tracking-widest text-slate-500">Category</Label>
                                <Select
                                    value={uploadForm.category || 'General'}
                                    onValueChange={(value) => setUploadForm({...uploadForm, category: value as any})}
                                >
                                    <SelectTrigger className="rounded-xl border-2 font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PHOTO_CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat} className="font-bold">{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 flex justify-end gap-2 border-t">
                        <Button variant="outline" onClick={() => setUploadModalOpen(false)} className="rounded-xl font-bold">
                            Cancel
                        </Button>
                        <Button onClick={handleSavePhoto} disabled={!tempPreview} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold px-6 shadow-lg shadow-indigo-600/20">
                            <SaveIcon className="w-4 h-4 mr-2" />
                            Save to Log
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Preview Modal */}
            <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
                <DialogContent className="max-w-6xl max-h-[90vh] p-0 border-none shadow-2xl rounded-[2rem] overflow-hidden">
                    {previewPhoto && (
                        <div className="flex flex-col md:flex-row h-full">
                            <div className="flex-1 bg-slate-900 flex items-center justify-center p-4 relative group">
                                <img
                                    src={previewPhoto.url}
                                    className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
                                />
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border-none"
                                    onClick={() => setPreviewPhoto(null)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="w-full md:w-96 bg-white flex flex-col h-full border-l">
                                <div className="p-8 flex-1 overflow-y-auto">
                                    <Badge className="mb-4 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none px-3 py-1 font-black uppercase tracking-widest text-[10px]">
                                        {previewPhoto.category}
                                    </Badge>
                                    <h2 className="text-2xl font-black text-slate-900 leading-tight mb-2">{previewPhoto.caption}</h2>
                                    <div className="flex flex-col gap-2 mb-8">
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-tight">
                                            <Calendar className="w-4 h-4 text-indigo-500" />
                                            Observed on {previewPhoto.date}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-tight">
                                            <MapPin className="w-4 h-4 text-indigo-500" />
                                            {previewPhoto.location}
                                        </div>
                                    </div>

                                    <div className="border-t-2 border-slate-50 pt-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">AI SITE AUDITOR</h3>
                                            {!previewPhoto.isAnalyzed && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleAnalyze(previewPhoto)}
                                                    disabled={isAnalyzing}
                                                    className="bg-indigo-600 hover:bg-indigo-700 rounded-full font-bold shadow-lg shadow-indigo-600/20 animate-bounce"
                                                >
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                    {isAnalyzing ? "Scanning..." : "Analyze Progress"}
                                                </Button>
                                            )}
                                        </div>
                                        
                                        {previewPhoto.isAnalyzed ? (
                                            <div className="p-5 bg-indigo-50/50 rounded-2xl border-2 border-indigo-100 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                                    <Sparkles size={40} className="text-indigo-600" />
                                                </div>
                                                <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed relative z-10">
                                                    {previewPhoto.aiAnalysis}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center border-2 border-dashed rounded-2xl bg-slate-50/50">
                                                <History className="w-8 h-8 mx-auto mb-3 text-slate-200" />
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                                                    No automated intelligence reports<br/>generated for this capture.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-50 border-t mt-auto">
                                    <Button
                                        variant="destructive"
                                        className="w-full rounded-xl font-bold h-12 shadow-lg shadow-red-600/10 hover:bg-red-600"
                                        onClick={() => { handleDeletePhoto(previewPhoto.id); setPreviewPhoto(null); }}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Investigation Record
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

// Internal icon component since Save isn't imported from lucide
const SaveIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);

export default SitePhotosModule;
