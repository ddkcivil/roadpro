import React, { useState } from 'react';
import { motion, easeOut } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';
import { Separator } from '~/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Slider } from '~/components/ui/slider';
import { AppSettings } from '../../types';
import { Settings, Palette, Shield, Cloud, Save, BarChart3, Bell, Activity, Share2, Info, Image as ImageIcon, Mail, AlertCircle, MapPin, Building2, DollarSign, Globe, Lock, Clock, Eye, Database, Zap, CheckCircle2, Sparkles } from 'lucide-react';
import { NotificationSettings } from './NotificationSettings';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } }
};


interface Props {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
}

const SettingsModule: React.FC<Props> = ({ settings, onUpdate }) => {
  const [activeTab, setActiveTab] = useState("general");
  const [formData, setFormData] = useState<AppSettings>(settings);

  const handleUpdate = (e?: React.FormEvent) => {
      e?.preventDefault();
      onUpdate(formData);
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <form onSubmit={handleUpdate}>
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                    <Settings size={28} className="text-primary" />
                </div>
                <div>
                    <h4 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">System Settings</h4>
                    <p className="text-sm text-muted-foreground">Configure your project parameters and integrations</p>
                </div>
            </div>
            <Button 
                type="submit" 
                className="px-6 py-2.5 font-bold rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
            >
                <Save size={18} className="mr-2" /> 
                Save Changes
            </Button>
        </motion.div>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
          <motion.div variants={itemVariants}>
            <Card className="rounded-2xl overflow-hidden mb-6 glass-card border-border/50">
              <TabsList className="grid w-full grid-cols-8 h-auto rounded-none bg-transparent border-b border-border/50 p-1 gap-1">
                <TabsTrigger value="general" className="rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm text-xs font-semibold h-14 flex flex-col items-center gap-1.5 transition-all duration-300 hover:bg-muted/50">
                  <Settings size={18}/> 
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm text-xs font-semibold h-14 flex flex-col items-center gap-1.5 transition-all duration-300 hover:bg-muted/50">
                  <Palette size={18}/> 
                  <span className="hidden sm:inline">Appearance</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm text-xs font-semibold h-14 flex flex-col items-center gap-1.5 transition-all duration-300 hover:bg-muted/50">
                  <Shield size={18}/> 
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
                <TabsTrigger value="cloud-integrations" className="rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm text-xs font-semibold h-14 flex flex-col items-center gap-1.5 transition-all duration-300 hover:bg-muted/50">
                  <Cloud size={18}/> 
                  <span className="hidden sm:inline">Cloud</span>
                </TabsTrigger>
                <TabsTrigger value="project-parameters" className="rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm text-xs font-semibold h-14 flex flex-col items-center gap-1.5 transition-all duration-300 hover:bg-muted/50">
                  <MapPin size={18}/> 
                  <span className="hidden sm:inline">Parameters</span>
                </TabsTrigger>
                <TabsTrigger value="reporting" className="rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm text-xs font-semibold h-14 flex flex-col items-center gap-1.5 transition-all duration-300 hover:bg-muted/50">
                  <BarChart3 size={18}/> 
                  <span className="hidden sm:inline">Reports</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm text-xs font-semibold h-14 flex flex-col items-center gap-1.5 transition-all duration-300 hover:bg-muted/50">
                  <Bell size={18}/> 
                  <span className="hidden sm:inline">Alerts</span>
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm text-xs font-semibold h-14 flex flex-col items-center gap-1.5 transition-all duration-300 hover:bg-muted/50">
                  <Activity size={18}/> 
                  <span className="hidden sm:inline">Widgets</span>
                </TabsTrigger>
              </TabsList>
            </Card>
          </motion.div>

          {/* TAB 0: General */}
          <TabsContent value="general">
              <motion.div variants={itemVariants} className="grid gap-6">
                <Card className="rounded-2xl glass-card border-border/50 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Building2 size={20} className="text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Organization Details</CardTitle>
                        <CardDescription>Configure your company information</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="company-name" className="text-sm font-medium text-muted-foreground">Company Name</Label>
                          <Input 
                              id="company-name"
                              value={formData.companyName} 
                              onChange={e => setFormData({...formData, companyName: e.target.value})}
                              className="rounded-xl border-border/50 focus:ring-primary/20"
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="default-currency" className="text-sm font-medium text-muted-foreground">Default Currency</Label>
                          <Select
                              value={formData.currency}
                              onValueChange={(value) => setFormData({...formData, currency: value})}
                          >
                              <SelectTrigger id="default-currency" className="rounded-xl border-border/50">
                                  <SelectValue placeholder="Select a currency" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="USD">USD ($)</SelectItem>
                                  <SelectItem value="NPR">NPR (Rs.)</SelectItem>
                                  <SelectItem value="INR">INR (₹)</SelectItem>
                                  <SelectItem value="EUR">EUR (€)</SelectItem>
                                  <SelectItem value="GBP">GBP (£)</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
                  </CardContent>
                </Card>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <Label htmlFor="company-name" className="mb-2 block">Company Name</Label>
                          <Input 
                              id="company-name"
                              value={formData.companyName} 
                              onChange={e => setFormData({...formData, companyName: e.target.value})} 
                          />
                      </div>
                      <div>
                          <Label htmlFor="default-currency" className="mb-2 block">Default Currency</Label>
                          <Select
                              value={formData.currency}
                              onValueChange={(value) => setFormData({...formData, currency: value})}
                          >
                              <SelectTrigger id="default-currency">
                                  <SelectValue placeholder="Select a currency" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="USD">USD ($)</SelectItem>
                                  <SelectItem value="NPR">NPR (Rs.)</SelectItem>
                                  <SelectItem value="INR">INR (₹)</SelectItem>
                                  <SelectItem value="EUR">EUR (€)</SelectItem>
                                  <SelectItem value="GBP">GBP (£)</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>

                <Card className="rounded-2xl glass-card border-border/50 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-emerald-500/5 to-transparent border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10">
                        <DollarSign size={20} className="text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Financial Defaults</CardTitle>
                        <CardDescription>Set your financial parameters</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <Label htmlFor="vat-rate" className="text-sm font-medium text-muted-foreground">Default VAT Rate (%)</Label>
                          <Input 
                              id="vat-rate"
                              type="number"
                              value={formData.vatRate} 
                              onChange={e => setFormData({...formData, vatRate: parseFloat(e.target.value) || 0})}
                              className="rounded-xl border-border/50"
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="fiscal-year-start" className="text-sm font-medium text-muted-foreground">Fiscal Year Start</Label>
                          <Input 
                              id="fiscal-year-start"
                              type="date"
                              value={formData.fiscalYearStart} 
                              onChange={e => setFormData({...formData, fiscalYearStart: e.target.value})}
                              className="rounded-xl border-border/50"
                          />
                      </div>
                  </div>
                  </CardContent>
                </Card>
                            
                <Card className="rounded-2xl glass-card border-border/50 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-500/5 to-transparent border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10">
                        <Globe size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">System Configuration</CardTitle>
                        <CardDescription>Regional and backup settings</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <Label htmlFor="default-timezone" className="text-sm font-medium text-muted-foreground">Default Timezone</Label>
                          <Select
                              value={formData.timezone || "UTC+05:45"}
                              onValueChange={(value) => setFormData({...formData, timezone: value})}
                          >
                              <SelectTrigger id="default-timezone" className="rounded-xl border-border/50">
                                  <SelectValue placeholder="Select a timezone" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="UTC+05:45">Nepal Time (UTC+05:45)</SelectItem>
                                  <SelectItem value="UTC+00:00">GMT (UTC+00:00)</SelectItem>
                                  <SelectItem value="UTC+01:00">CET (UTC+01:00)</SelectItem>
                                  <SelectItem value="UTC+05:30">IST (UTC+05:30)</SelectItem>
                                  <SelectItem value="UTC-05:00">EST (UTC-05:00)</SelectItem>
                                  <SelectItem value="UTC-08:00">PST (UTC-08:00)</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="date-format" className="text-sm font-medium text-muted-foreground">Date Format</Label>
                          <Select
                              value={formData.dateFormat || "DD/MM/YYYY"}
                              onValueChange={(value) => setFormData({...formData, dateFormat: value})}
                          >
                              <SelectTrigger id="date-format" className="rounded-xl border-border/50">
                                  <SelectValue placeholder="Select a date format" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                                  <SelectItem value="DD-MMM-YYYY">DD-MMM-YYYY</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-border/50">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                          <div>
                            <Label htmlFor="backup-enabled" className="text-sm font-medium">Enable Auto-backup</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Automatically backup your data</p>
                          </div>
                          <Switch 
                              id="backup-enabled"
                              checked={formData.backupEnabled || false} 
                              onCheckedChange={(checked) => setFormData({...formData, backupEnabled: checked})}
                              className="data-[state=checked]:bg-primary"
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="backup-frequency" className="text-sm font-medium text-muted-foreground">Backup Frequency</Label>
                          <Select
                              value={formData.backupFrequency || "daily"}
                              onValueChange={(value) => setFormData({...formData, backupFrequency: value})}
                          >
                              <SelectTrigger id="backup-frequency" className="rounded-xl border-border/50">
                                  <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="hourly">Hourly</SelectItem>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
                  </CardContent>
                </Card>
              </motion.div>
          </TabsContent>
                    
          {/* TAB 1: Cloud Integrations */}
          <TabsContent value="cloud-integrations">
              <div className="space-y-6">
                  <Card className="rounded-md">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-6">
                          <Avatar className="bg-[#eef2ff] text-[#4f46e5] w-10 h-10">
                            <AvatarFallback><Cloud size={20}/></AvatarFallback>
                          </Avatar>
                          <div>
                            <h6 className="text-lg font-bold">Google Sheets Data Bridge</h6>
                            <p className="text-sm text-gray-500">Connect your project registry to a Google Spreadsheet for bi-directional updates.</p>
                          </div>
                      </div>
                      
                      <div className="space-y-4">
                          <div>
                            <Label htmlFor="google-spreadsheet-id" className="mb-2 block">Google Spreadsheet ID</Label>
                            <Input 
                              id="google-spreadsheet-id"
                              placeholder="e.g. 1aBCdEfgHijkLmNoPqRsTuVwXyZ"
                              value={formData.googleSpreadsheetId || ''} 
                              onChange={e => setFormData({...formData, googleSpreadsheetId: e.target.value})}
                            />
                            <p className="text-sm text-gray-500 mt-1">The ID is found in the URL: docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit</p>
                          </div>
                                                    
                          <Alert className="rounded-md p-4 bg-blue-50 border-blue-200 text-blue-800">
                              <AlertTitle className="font-bold flex items-center gap-2"><Share2 size={20}/> Step 2: Grant System Permissions</AlertTitle>
                              <AlertDescription className="mt-2 text-sm">
                                To allow the app to read and write to your sheet, you must <strong>Share</strong> your spreadsheet with the system service email:
                                <div className="mt-3 p-2 bg-gray-50 rounded-md border border-dashed">
                                  roadmaster-bot@engineering-os.iam.gserviceaccount.com
                                </div>
                              </AlertDescription>
                          </Alert>
                      
                          <div className="p-4 bg-muted rounded-md border border-gray-200">
                              <p className="text-sm font-bold mb-2 flex items-center gap-1">
                                  <Info size={16} className="text-primary"/> Synchronized Data Maps
                              </p>
                              <p className="text-xs text-gray-500">
                                  When enabled, the system will automatically look for the following tabs in your Google Sheet:
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                                  {['BOQ_Master', 'Physical_Progress', 'Financial_Ledger', 'Quality_Logs'].map(tab => (
                                      <Badge key={tab} variant="outline" className="font-mono text-xs">{tab}</Badge>
                                  ))}
                              </div>
                          </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="rounded-md">
                    <CardContent className="p-6">
                      <h6 className="text-lg font-bold mb-2 text-primary">Webhooks</h6>
                      <p className="text-sm text-gray-500 mb-4">Send real-time JSON payloads to external systems (e.g. Zapier, ERP).</p>
                      <div>
                        <Label htmlFor="event-notification-url" className="sr-only">Event Notification URL</Label>
                        <Input 
                          id="event-notification-url"
                          placeholder="https://hooks.zapier.com/..." 
                        />
                      </div>
                    </CardContent>
                  </Card>
              </div>
          </TabsContent>

          {/* TAB 2: Project Parameters */}
          <TabsContent value="project-parameters">
              <Card className="rounded-md mb-3">
                <CardContent>
                  <h6 className="text-lg font-bold mb-2 text-primary">Chainage & Location</h6>
                  <p className="text-sm text-gray-500 mb-6">Define the standard project bounds for validation.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="col-span-1">
                      <Label htmlFor="chainage-format" className="mb-2 block">Chainage Format</Label>
                          <Select
                              value={formData.chainageFormat || "KM"}
                              onValueChange={(value) => setFormData({...formData, chainageFormat: value})}
                          >
                              <SelectTrigger id="chainage-format" className="w-full mb-2">
                                  <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="KM">KM (e.g., 1+000.00)</SelectItem>
                                  <SelectItem value="M">Meters (e.g., 1000.00)</SelectItem>
                                  <SelectItem value="MILES">Miles (e.g., 0.62)</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="col-span-1">
                          <Label htmlFor="start-chainage" className="mb-2 block">Start Chainage (Km)</Label>
                          <Input
                              id="start-chainage"
                              placeholder="0+000.00"
                              className="mb-2"
                              value={formData.startChainage || ""}
                              onChange={(e) => setFormData({...formData, startChainage: e.target.value})}
                          />
                      </div>
                      <div className="col-span-1">
                          <Label htmlFor="end-chainage" className="mb-2 block">End Chainage (Km)</Label>
                          <Input
                              id="end-chainage"
                              placeholder="15+000.00"
                              className="mb-2"
                              value={formData.endChainage || ""}
                              onChange={(e) => setFormData({...formData, endChainage: e.target.value})}
                          />
                      </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
                      <p className="text-sm font-bold text-blue-900 flex items-center gap-1">
                          <Settings size={16}/> Auto-Numbering Logic
                      </p>
                      <p className="text-xs text-blue-800 mt-1">
                          RFI and Report numbers are currently auto-generated based on the format: <strong>PREFIX-CODE-SEQUENCE</strong>. 
                      </p>
                  </div>

                  <Separator className="my-6" />

                  <h6 className="text-lg font-bold mb-2 text-primary">Spatial Configuration</h6>
                  <p className="text-sm text-gray-500 mb-6">Set the default map view for projects without specific coordinates.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <Label htmlFor="default-location" className="mb-2 block flex items-center gap-2">
                            <MapPin size={16}/> Default GIS Location (Lat, Lng)
                          </Label>
                          <Input 
                              id="default-location"
                              placeholder="e.g. 27.7006, 83.4484 (Butwal)"
                              value={formData.defaultLocation || ''} 
                              onChange={e => setFormData({...formData, defaultLocation: e.target.value})} 
                          />
                          <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider">
                            Used as fallback when project location is not set.
                          </p>
                      </div>
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          {/* TAB 3: Reporting */}
          <TabsContent value="reporting">
              <Card className="rounded-md mb-3">
                <CardContent>
                  <h6 className="text-lg font-bold mb-4 text-primary">Report Branding</h6>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                          <div 
                              className="h-[150px] border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-primary hover:text-primary hover:bg-blue-50 transition-colors"
                          >
                              <ImageIcon size={28} />
                              <p className="text-xs mt={2}">Upload Company Logo</p>
                          </div>
                      </div>
                      <div>
                          <Label htmlFor="report-footer" className="mb-2 block">Report Footer / Disclaimer Text</Label>
                          <textarea 
                              id="report-footer"
                              className="flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              defaultValue="This report is generated automatically. Please verify critical data on site."
                              placeholder="Enter disclaimer text for reports..."
                              title="Report Footer Disclaimer"
                          ></textarea>
                          <div className="flex items-center space-x-2 mt-4">
                              <Switch id="include-signature-block" defaultChecked />
                              <Label htmlFor="include-signature-block">Include Signature Block</Label>
                          </div>
                      </div>
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          {/* TAB 4: Notifications */}
          <TabsContent value="notifications">
              <NotificationSettings />
          </TabsContent>
          
          {/* TAB 5: Appearance */}
          <TabsContent value="appearance">
              <motion.div variants={itemVariants} className="grid gap-6">
                <Card className="rounded-2xl glass-card border-border/50 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-violet-500/5 to-transparent border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-violet-500/10">
                        <Palette size={20} className="text-violet-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Theme Settings</CardTitle>
                        <CardDescription>Customize the look and feel</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <Label htmlFor="theme" className="text-sm font-medium text-muted-foreground">Theme</Label>
                          <Select
                              value={formData.theme || "light"}
                              onValueChange={(value) => setFormData({...formData, theme: value})}
                          >
                              <SelectTrigger id="theme" className="rounded-xl border-border/50">
                                  <SelectValue placeholder="Select theme" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="light">Light</SelectItem>
                                  <SelectItem value="dark">Dark</SelectItem>
                                  <SelectItem value="system">System Default</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="primary-color" className="text-sm font-medium text-muted-foreground">Primary Color</Label>
                          <div className="flex items-center gap-3">
                            <Input 
                                id="primary-color"
                                type="color"
                                value={formData.primaryColor || "#3b82f6"} 
                                onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                                className="w-16 h-10 rounded-lg cursor-pointer border-border/50"
                            />
                            <Input 
                                value={formData.primaryColor || "#3b82f6"} 
                                onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                                className="rounded-xl border-border/50 font-mono text-sm"
                                placeholder="#3b82f6"
                            />
                          </div>
                      </div>
                  </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl glass-card border-border/50 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-amber-500/5 to-transparent border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10">
                        <Eye size={20} className="text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Display Options</CardTitle>
                        <CardDescription>Configure interface behavior</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                          <div>
                            <Label htmlFor="compact-mode" className="text-sm font-medium">Compact Mode</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Reduce spacing for more content</p>
                          </div>
                          <Switch 
                              id="compact-mode"
                              checked={formData.compactMode || false} 
                              onCheckedChange={(checked) => setFormData({...formData, compactMode: checked})}
                              className="data-[state=checked]:bg-primary"
                          /> 
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                          <div>
                            <Label htmlFor="auto-collapse-sidebar" className="text-sm font-medium">Auto-collapse Sidebar</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Automatically collapse on small screens</p>
                          </div>
                          <Switch id="auto-collapse-sidebar" defaultChecked className="data-[state=checked]:bg-primary" /> 
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl glass-card border-border/50 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-cyan-500/5 to-transparent border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-cyan-500/10">
                        <Globe size={20} className="text-cyan-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Language & Localization</CardTitle>
                        <CardDescription>Set your preferred language</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <Label htmlFor="language" className="text-sm font-medium text-muted-foreground">Language</Label>
                          <Select
                              value="en"
                              onValueChange={(value) => console.log("Language changed to:", value)}
                          >
                              <SelectTrigger id="language" className="rounded-xl border-border/50">
                                  <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="en">English</SelectItem>
                                  <SelectItem value="np">Nepali</SelectItem>
                                  <SelectItem value="hi">Hindi</SelectItem>
                                  <SelectItem value="de">German</SelectItem>
                                  <SelectItem value="fr">French</SelectItem>
                                  <SelectItem value="es">Spanish</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                          <div>
                            <Label htmlFor="show-language-selector" className="text-sm font-medium">Show Language Selector</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Display in header</p>
                          </div>
                          <Switch id="show-language-selector" defaultChecked className="data-[state=checked]:bg-primary" /> 
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
          </TabsContent>
          
                    {/* TAB 6: Security */}
          <TabsContent value="security">
              <motion.div variants={itemVariants} className="grid gap-6">
                <Card className="rounded-2xl glass-card border-border/50 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-red-500/5 to-transparent border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-red-500/10">
                        <Lock size={20} className="text-red-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Password Policy</CardTitle>
                        <CardDescription>Enforce secure authentication</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                                    <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <Label htmlFor="min-password-length" className="text-sm font-medium text-muted-foreground">Minimum Password Length</Label>
                          <Input 
                              id="min-password-length"
                              type="number"
                              value={formData.minPasswordLength || 8} 
                              onChange={(e) => setFormData({...formData, minPasswordLength: parseInt(e.target.value) || 0})}
                              className="rounded-xl border-border/50"
                          />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                          <div>
                            <Label htmlFor="require-numbers" className="text-sm font-medium">Require Numbers</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Include numeric characters</p>
                          </div>
                          <Switch id="require-numbers" defaultChecked className="data-[state=checked]:bg-primary" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/50">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                          <div>
                            <Label htmlFor="require-special-chars" className="text-sm font-medium">Require Special Characters</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Include !@#$% etc</p>
                          </div>
                          <Switch id="require-special-chars" defaultChecked className="data-[state=checked]:bg-primary" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                          <div>
                            <Label htmlFor="require-uppercase" className="text-sm font-medium">Require Uppercase</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Include A-Z</p>
                          </div>
                          <Switch id="require-uppercase" defaultChecked className="data-[state=checked]:bg-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl glass-card border-border/50 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-amber-500/5 to-transparent border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10">
                        <Clock size={20} className="text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Session Management</CardTitle>
                        <CardDescription>Control session behavior</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <Label htmlFor="session-timeout" className="text-sm font-medium text-muted-foreground">Session Timeout (minutes)</Label>
                          <Input 
                              id="session-timeout"
                              type="number"
                              value={30} 
                              readOnly
                              className="rounded-xl border-border/50"
                          />
                          <p className="text-xs text-muted-foreground">Session expires after inactivity period</p>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                          <div>
                            <Label htmlFor="enable-two-factor-auth" className="text-sm font-medium">Enable Two-Factor Authentication</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Extra security layer</p>
                          </div>
                          <Switch id="enable-two-factor-auth" className="data-[state=checked]:bg-primary" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/50">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                          <div>
                            <Label htmlFor="enable-audit-logging" className="text-sm font-medium">Enable Audit Logging</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Track all system actions</p>
                          </div>
                          <Switch id="enable-audit-logging" defaultChecked className="data-[state=checked]:bg-primary" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                          <div>
                            <Label htmlFor="log-user-actions" className="text-sm font-medium">Log User Actions</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Detailed activity tracking</p>
                          </div>
                          <Switch id="log-user-actions" defaultChecked className="data-[state=checked]:bg-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
          </TabsContent>
          
                    {/* TAB 7: Dashboard */}
          <TabsContent value="dashboard">
              <motion.div variants={itemVariants} className="grid gap-6">
                <Card className="rounded-2xl glass-card border-border/50 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-indigo-500/5 to-transparent border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-500/10">
                        <Activity size={20} className="text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Dashboard Widgets</CardTitle>
                        <CardDescription>Manage widget visibility and behavior</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                        <div>
                            <p className="text-sm font-bold">Progress Tracking</p>
                            <p className="text-xs text-muted-foreground">Monitor project progress metrics</p>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                      </div>
                    
                                          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                        <div>
                            <p className="text-sm font-bold">Financial Overview</p>
                            <p className="text-xs text-muted-foreground">Track budget and expenses</p>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                        <div>
                            <p className="text-sm font-bold">Schedule Tracking</p>
                            <p className="text-xs text-muted-foreground">Monitor timeline and milestones</p>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                        <div>
                            <p className="text-sm font-bold">Quality Metrics</p>
                            <p className="text-xs text-muted-foreground">Track quality control measures</p>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                        <div>
                            <p className="text-sm font-bold">Resource Allocation</p>
                            <p className="text-xs text-muted-foreground">Monitor resource utilization</p>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                        <div>
                            <p className="text-sm font-bold">Document Status</p>
                            <p className="text-xs text-muted-foreground">Track document approvals and reviews</p>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-border/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-purple-500/10">
                          <Activity size={20} className="text-purple-600" />
                        </div>
                        <h3 className="text-lg font-bold">Dashboard Behavior</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                            <div>
                              <Label htmlFor="auto-refresh-charts" className="text-sm font-medium">Auto-refresh Charts</Label>
                              <p className="text-xs text-muted-foreground mt-0.5">Real-time updates every intervals</p>
                            </div>
                            <Switch id="auto-refresh-charts" defaultChecked className="data-[state=checked]:bg-primary" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="refresh-interval" className="text-sm font-medium text-muted-foreground">Refresh Interval (seconds)</Label>
                            <Input 
                                id="refresh-interval"
                                type="number"
                                value={300} 
                                readOnly
                                className="rounded-xl border-border/50"
                            />
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-border/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-sky-500/10">
                          <Globe size={20} className="text-sky-600" />
                        </div>
                        <h3 className="text-lg font-bold">Default View</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="default-view" className="text-sm font-medium text-muted-foreground">Default View</Label>
                            <Select
                                value={formData.dashboardDefaultView || "grid"}
                                onValueChange={(value) => setFormData({...formData, dashboardDefaultView: value})}
                            >
                                <SelectTrigger id="default-view" className="rounded-xl border-border/50">
                                    <SelectValue placeholder="Select view" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="grid">Grid Layout</SelectItem>
                                    <SelectItem value="list">List Layout</SelectItem>
                                    <SelectItem value="compact">Compact Layout</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
                            <div>
                              <Label htmlFor="show-charts" className="text-sm font-medium">Show Charts</Label>
                              <p className="text-xs text-muted-foreground mt-0.5">Display charts on dashboard</p>
                            </div>
                            <Switch id="show-charts" defaultChecked className="data-[state=checked]:bg-primary" />
                        </div>
                      </div>
                    </div>
                    </CardContent>
                  </Card>
              </motion.div>
          </TabsContent>
                </Tabs>
      </form>
    </motion.div>
  );
};

export default SettingsModule;
