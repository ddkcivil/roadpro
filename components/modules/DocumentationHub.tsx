import React, { useState, useRef } from 'react';
import { Project, UserRole } from '../../types';
import { 
    Trash2, 
    Calendar, MapPin, Plus, Folder,
    ImageIcon, Sun, Cloud,
    FileSpreadsheet, AlertTriangle, BookOpen, Printer,
    Eye, CloudRain
} from 'lucide-react';
import DocumentsModule from './DocumentsModule';
import SitePhotosModule from './SitePhotosModule';
import DailyReportModule from './DailyReportModule';
import MPRReportModule from './MPRReportModule';

import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { AppSettings } from '../../types';

interface Props {
  project: Project;
  userRole: UserRole;
  settings: AppSettings;
  onProjectUpdate: (project: Project) => void;
  onNavigate?: (tab: string) => void;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
}

const DocumentationHub: React.FC<Props> = ({ project, userRole, settings, onProjectUpdate, onNavigate, isLoading, onRefresh }) => {
  const [activeTab, setActiveTab] = useState("documents");

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
  
  // === HANDLERS ===
  const handleExportMPR = () => {
    alert('MPR export functionality is not yet implemented.');
  };

  return (
    <div className="p-4 h-[calc(100vh-140px)] overflow-y-auto">
      <div className="flex justify-between mb-4 items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentation Hub</h1>
          <p className="text-sm text-muted-foreground">Unified document, photo, and reporting management</p>
        </div>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="documents">
                <Folder className="mr-2 h-4 w-4" /> Documents ({project.documents?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="site-photos">
              <ImageIcon className="mr-2 h-4 w-4" /> Site Photos ({project.sitePhotos?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="daily-reports">
              <BookOpen className="mr-2 h-4 w-4" /> Daily Reports ({project.dailyReports?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="mpr-reports">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> MPR Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="p-0 border-none mt-0">
            <DocumentsModule 
              project={project} 
              userRole={userRole} 
              onProjectUpdate={onProjectUpdate} 
              isLoading={isLoading}
              onRefresh={onRefresh}
            />
          </TabsContent>

          <TabsContent value="site-photos" className="p-0 border-none mt-0">
            <SitePhotosModule 
              project={project}
              userRole={userRole}
              onProjectUpdate={onProjectUpdate}
              hideHeader={true}
            />
          </TabsContent>

          <TabsContent value="daily-reports" className="p-0 border-none mt-0">
            <DailyReportModule 
              project={project}
              userRole={userRole}
              onProjectUpdate={onProjectUpdate}
              initialView="list"
              hideHeader={true}
            />
          </TabsContent>

          <TabsContent value="mpr-reports" className="p-0 border-none mt-0">
            <MPRReportModule 
              project={project}
              settings={settings}
              hideStats={true}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default DocumentationHub;
