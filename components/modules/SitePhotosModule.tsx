import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    Camera, Upload, Search, Filter, Sparkles, Trash2,
    Calendar, MapPin, X,
    HardHat, History, Wifi, WifiOff
} from 'lucide-react';
import { Project, SitePhoto, UserRole } from '../../types';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Textarea } from '~/components/ui/textarea';

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
            (p.caption.toLowerCase().includes(searchTerm.toLowerCase()) ||
             p.location.toLowerCase().includes(searchTerm.toLowerCase()))
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
        if (!tempPreview) return;

        // Convert the temporary blob URL to base64 data to store permanently
        const base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Extract just the base64 portion after the comma
                resolve(base64String.split(',')[1]);
            };
            reader.readAsDataURL(tempFile);
        });

        const newPhoto: SitePhoto = {
            id: `img-${Date.now()}`,
            url: `data:image/${tempFile!.type.split('/')[1] || 'jpeg'};base64,${base64Data as string}`, // Store as base64 data URL
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
        // Clean up the temporary blob URL
        if (tempPreview) {
            URL.revokeObjectURL(tempPreview);
        }
        setUploadModalOpen(false);
        setTempFile(null);
        setTempPreview(null);
    };

    const handleAnalyze = async (photo: SitePhoto) => {
        setIsAnalyzing(true);
        try {
            // Mock analysis for now
            const analysis = "AI analysis would be performed here.";
            const updatedPhotos = project.sitePhotos?.map(p =>
                p.id === photo.id ? { ...p, aiAnalysis: analysis, isAnalyzed: true } : p
            );
            onProjectUpdate({ ...project, sitePhotos: updatedPhotos });
            if (previewPhoto?.id === photo.id) {
                setPreviewPhoto(prev => prev ? { ...prev, aiAnalysis: analysis, isAnalyzed: true } : null);
            }
        } catch (error) {
            console.error("Analysis failed", error);
            alert('Failed to analyze photo: ' + (error as Error).message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const canDelete = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER;

    const handleDeletePhoto = (id: string) => {
        if (!canDelete) {
            alert('Only Admin and Project Manager can delete photos');
            return;
        }

        if (confirm("Delete this site photo permanently?")) {
            onProjectUpdate({ ...project, sitePhotos: sitePhotos.filter(p => p.id !== id) });
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex justify-between mb-4 items-center">
                <div>
                    <h1 className="text-2xl font-black">Visual Intelligence</h1>
                    <p className="text-sm text-muted-foreground">Site surveillance and AI-powered progress monitoring</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setUploadModalOpen(true)}>
                        <Camera className="w-4 h-4 mr-2" />
                        Capture Update
                    </Button>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800">
                        <Wifi className="w-4 h-4" />
                        <span className="text-sm font-semibold">Online</span>
                    </div>
                </div>
            </div>

            <Card className="p-4 mb-6">
                <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search captions, locations..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={categoryFilter === 'All' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCategoryFilter('All')}
                        >
                            All
                        </Button>
                        {PHOTO_CATEGORIES.map(cat => (
                            <Button
                                key={cat}
                                variant={categoryFilter === cat ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCategoryFilter(cat)}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredPhotos.map(photo => (
                    <Card
                        key={photo.id}
                        className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
                        onClick={() => setPreviewPhoto(photo)}
                    >
                        <div className="aspect-video overflow-hidden rounded-t-lg">
                            <img
                                src={photo.url}
                                alt={photo.caption}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-2">
                                <Badge variant="outline">{photo.category}</Badge>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    {photo.date}
                                </div>
                            </div>
                            <h3 className="font-semibold text-sm mb-1 truncate">{photo.caption}</h3>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                {photo.location}
                            </div>
                            {photo.isAnalyzed && (
                                <div className="mt-3 p-2 bg-indigo-50 rounded border border-indigo-100">
                                    <div className="flex items-center gap-1 text-xs text-primary font-semibold">
                                        <Sparkles className="w-3 h-3" />
                                        AI Analyzed
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Upload Modal */}
            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Record Field Observation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div
                            className="h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer bg-muted hover:bg-muted transition-colors overflow-hidden"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {tempPreview ? (
                                <img src={tempPreview} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <Upload className="w-8 h-8 mx-auto mb-2" />
                                    <p className="text-sm">Select Site Image</p>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                hidden
                                accept="image/*"
                                onChange={handleFileSelect}
                            />
                        </div>
                        <div>
                            <Label htmlFor="caption">Observation Caption</Label>
                            <Input
                                id="caption"
                                value={uploadForm.caption}
                                onChange={e => setUploadForm({...uploadForm, caption: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="location">Location</Label>
                                <Input
                                    id="location"
                                    value={uploadForm.location}
                                    onChange={e => setUploadForm({...uploadForm, location: e.target.value})}
                                />
                            </div>
                            <div>
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={uploadForm.category || 'General'}
                                    onValueChange={(value) => setUploadForm({...uploadForm, category: value as any})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PHOTO_CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSavePhoto} disabled={!tempPreview}>
                            <Upload className="w-4 h-4 mr-2" />
                            Save to Log
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Preview Modal */}
            <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
                <DialogContent className="max-w-6xl max-h-[80vh] p-0">
                    {previewPhoto && (
                        <div className="flex h-full">
                            <div className="flex-1 flex items-center justify-center p-6 relative">
                                <img
                                    src={previewPhoto.url}
                                    className="max-w-full max-h-full object-contain rounded-lg"
                                />
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="absolute top-4 right-4"
                                    onClick={() => setPreviewPhoto(null)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="w-96 bg-white p-6 overflow-y-auto">
                                <h2 className="text-xl font-bold mb-4">{previewPhoto.caption}</h2>
                                <div className="flex gap-2 mb-4">
                                    <Badge>{previewPhoto.category}</Badge>
                                    <Badge variant="outline">{previewPhoto.date}</Badge>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                                    <MapPin className="w-4 h-4" />
                                    {previewPhoto.location}
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-semibold">AI SITE AUDITOR</h3>
                                        {!previewPhoto.isAnalyzed && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleAnalyze(previewPhoto)}
                                                disabled={isAnalyzing}
                                            >
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                {isAnalyzing ? "Processing..." : "Analyze Progress"}
                                            </Button>
                                        )}
                                    </div>
                                    {previewPhoto.isAnalyzed ? (
                                        <div className="p-3 bg-indigo-50 rounded border border-indigo-100">
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                                {previewPhoto.aiAnalysis}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">
                                            No automated analysis generated yet.
                                        </p>
                                    )}
                                </div>

                                <div className="mt-6">
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => { handleDeletePhoto(previewPhoto.id); setPreviewPhoto(null); }}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Record
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

export default SitePhotosModule;
