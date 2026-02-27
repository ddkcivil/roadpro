import React, { useState } from 'react';
import { Card, CardContent } from '~/components/ui/card';
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
import { Settings, Palette, Shield, Cloud, Save, BarChart3, Bell, Activity, Share2, Info, Image as ImageIcon, Mail, AlertCircle } from 'lucide-react';


interface Props {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
}

const SettingsModule: React.FC<Props> = ({ settings, onUpdate }) => {
  const [activeTab, setActiveTab] = useState("general");
  const [formData, setFormData] = useState<AppSettings>(settings);

  const handleUpdate = () => {
      onUpdate(formData);
  };

  return (
    <div className="animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h4 className="text-2xl font-extrabold tracking-tight">System Settings</h4>
                <p className="text-gray-500">Configure your project parameters and integrations</p>
            </div>
            <Button 
                onClick={handleUpdate} 
                className="px-6 py-2 font-bold rounded-lg"
            >
                <Save size={18} className="mr-2" /> 
                Save Changes
            </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
          <Card className="rounded-xl overflow-hidden mb-6">
            <TabsList className="grid w-full grid-cols-8 h-auto rounded-none border-b p-0">
              <TabsTrigger value="general" className="rounded-none border-r data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none text-sm font-semibold h-12 flex items-center gap-2">
                <Settings size={16}/> General
              </TabsTrigger>
              <TabsTrigger value="appearance" className="rounded-none border-r data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none text-sm font-semibold h-12 flex items-center gap-2">
                <Palette size={16}/> Appearance
              </TabsTrigger>
              <TabsTrigger value="security" className="rounded-none border-r data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none text-sm font-semibold h-12 flex items-center gap-2">
                <Shield size={16}/> Security
              </TabsTrigger>
              <TabsTrigger value="cloud-integrations" className="rounded-none border-r data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none text-sm font-semibold h-12 flex items-center gap-2">
                <Cloud size={16}/> Cloud Integrations
              </TabsTrigger>
              <TabsTrigger value="project-parameters" className="rounded-none border-r data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none text-sm font-semibold h-12 flex items-center gap-2">
                <Settings size={16}/> Project Parameters
              </TabsTrigger>
              <TabsTrigger value="reporting" className="rounded-none border-r data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none text-sm font-semibold h-12 flex items-center gap-2">
                <BarChart3 size={16}/> Reporting
              </TabsTrigger>
              <TabsTrigger value="notifications" className="rounded-none border-r data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none text-sm font-semibold h-12 flex items-center gap-2">
                <Bell size={16}/> Notifications
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none text-sm font-semibold h-12 flex items-center gap-2">
                <Activity size={16}/> Dashboard
              </TabsTrigger>
            </TabsList>
          </Card>

          {/* TAB 0: General */}
          <TabsContent value="general">
              <Card className="rounded-lg mb-3">
                <CardContent>
                  <h6 className="text-lg font-bold mb-4 text-primary">Organization Details</h6>
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

                  <Separator className="my-6" />

                  <h6 className="text-lg font-bold mb-4 text-primary">Financial Defaults</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <Label htmlFor="vat-rate" className="mb-2 block">Default VAT Rate (%)</Label>
                          <Input 
                              id="vat-rate"
                              type="number"
                              value={formData.vatRate} 
                              onChange={e => setFormData({...formData, vatRate: parseFloat(e.target.value) || 0})} 
                          />
                      </div>
                      <div>
                          <Label htmlFor="fiscal-year-start" className="mb-2 block">Fiscal Year Start</Label>
                          <Input 
                              id="fiscal-year-start"
                              type="date"
                              value={formData.fiscalYearStart} 
                              onChange={e => setFormData({...formData, fiscalYearStart: e.target.value})} 
                          />
                      </div>
                  </div>
                            
                  <Separator className="my-6" />
                            
                  <h6 className="text-lg font-bold mb-4 text-primary">System Configuration</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <Label htmlFor="default-timezone" className="mb-2 block">Default Timezone</Label>
                          <Select
                              value={formData.timezone || "UTC+05:45"}
                              onValueChange={(value) => setFormData({...formData, timezone: value})}
                          >
                              <SelectTrigger id="default-timezone">
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
                      <div>
                          <Label htmlFor="date-format" className="mb-2 block">Date Format</Label>
                          <Select
                              value={formData.dateFormat || "DD/MM/YYYY"}
                              onValueChange={(value) => setFormData({...formData, dateFormat: value})}
                          >
                              <SelectTrigger id="date-format">
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
                            
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <div className="flex items-center space-x-2">
                          <Switch 
                              id="backup-enabled"
                              checked={formData.backupEnabled || false} 
                              onCheckedChange={(checked) => setFormData({...formData, backupEnabled: checked})} 
                          />
                          <Label htmlFor="backup-enabled">Enable Auto-backup</Label>
                      </div>
                      <div>
                          <Label htmlFor="backup-frequency" className="mb-2 block">Backup Frequency</Label>
                          <Select
                              value={formData.backupFrequency || "daily"}
                              onValueChange={(value) => setFormData({...formData, backupFrequency: value})}
                          >
                              <SelectTrigger id="backup-frequency">
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
          </TabsContent>
                    
          {/* TAB 1: Cloud Integrations */}
          <TabsContent value="cloud-integrations">
              <div className="space-y-6">
                  <Card className="rounded-xl">
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
                                                    
                          <Alert className="rounded-lg p-4 bg-blue-50 border-blue-200 text-blue-800">
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
                  
                  <Card className="rounded-xl">
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
              <Card className="rounded-lg mb-3">
                <CardContent>
                  <h6 className="text-lg font-bold mb-2 text-primary">Chainage & Location</h6>
                  <p className="text-sm text-gray-500 mb-6">Define the standard project bounds for validation.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="col-span-1">
                      <Label htmlFor="chainage-format" className="mb-2 block">Chainage Format</Label>
                          <Select
                              value="KM" // Assuming "KM" is the default or initial value
                              onValueChange={(value) => console.log("Chainage format changed to:", value)} // Placeholder, replace with actual state update if needed
                          >
                              <SelectTrigger id="chainage-format" className="w-full mb-2">
                                  <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="KM">KM</SelectItem>
                                  <SelectItem value="M">M</SelectItem>
                                  <SelectItem value="MILES">Miles</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="col-span-1">
                          <Label htmlFor="start-chainage" className="mb-2 block">Start Chainage (Km)</Label>
                          <Input
                              id="start-chainage"
                              placeholder="0.000"
                              className="mb-2"
                          />
                      </div>
                      <div className="col-span-1">
                          <Label htmlFor="end-chainage" className="mb-2 block">End Chainage (Km)</Label>
                          <Input
                              id="end-chainage"
                              placeholder="15.000"
                              className="mb-2"
                          />
                      </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
                      <p className="text-sm font-bold text-blue-900 flex items-center gap={1}">
                          <Settings size={16}/> Auto-Numbering Logic
                      </p>
                      <p className="text-xs text-blue-800 mt-1">
                          RFI and Report numbers are currently auto-generated based on the format: <strong>PREFIX-CODE-SEQUENCE</strong>. 
                      </p>
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          {/* TAB 3: Reporting */}
          <TabsContent value="reporting">
              <Card className="rounded-lg mb-3">
                <CardContent>
                  <h6 className="text-lg font-bold mb-4 text-primary">Report Branding</h6>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                          <div 
                              className="h-[150px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-primary hover:text-primary hover:bg-blue-50 transition-colors"
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
              <Card className="rounded-lg mb-3">
                <CardContent>
                  <h6 className="text-lg font-bold mb-4 text-primary">Alert Preferences</h6>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <Card className="rounded-lg p-4">
                              <p className="text-base font-bold mb-4 flex items-center gap-2">
                                  <Mail size={16}/> Email Alerts
                              </p>
                              <div className="flex flex-col gap-3">
                                  <div className="flex items-center space-x-2">
                                      <Switch 
                                          id="enable-email-notifications"
                                          checked={formData.notifications.enableEmail} 
                                          onCheckedChange={checked => setFormData({
                                            ...formData, 
                                            notifications: {
                                              ...formData.notifications, 
                                              enableEmail: checked
                                            }
                                          })} 
                                        /> 
                                      <Label htmlFor="enable-email-notifications">Enable Email Notifications</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                      <Switch id="daily-digest-summary" defaultChecked /> 
                                      <Label htmlFor="daily-digest-summary">Daily Digest Summary</Label>
                                  </div>
                              </div>
                          </Card>
                      </div>
                      <div>
                          <Card className="rounded-lg p-4">
                              <p className="text-base font-bold mb-4 flex items-center gap-2">
                                  <AlertCircle size={16}/> Triggers
                              </p>
                              <div className="flex flex-col gap-3">
                                  <div className="flex items-center space-x-2">
                                      <Switch 
                                          id="alert-on-overdue-tasks"
                                          checked={formData.notifications.notifyOverdue} 
                                          onCheckedChange={checked => setFormData({
                                            ...formData, 
                                            notifications: {
                                              ...formData.notifications, 
                                              notifyOverdue: checked
                                            }
                                          })} 
                                        /> 
                                      <Label htmlFor="alert-on-overdue-tasks" className="text-red-500">Alert on Overdue Tasks</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                      <Switch 
                                          id="alert-on-upcoming-tasks"
                                          checked={formData.notifications.notifyUpcoming} 
                                          onCheckedChange={checked => setFormData({
                                            ...formData, 
                                            notifications: {
                                              ...formData.notifications, 
                                              notifyUpcoming: checked
                                            }
                                          })} 
                                        /> 
                                      <Label htmlFor="alert-on-upcoming-tasks">Alert on Upcoming Tasks</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                      <Switch 
                                          id="daily-digest"
                                          checked={formData.notifications.dailyDigest} 
                                          onCheckedChange={checked => setFormData({
                                            ...formData, 
                                            notifications: {
                                              ...formData.notifications, 
                                              dailyDigest: checked
                                            }
                                          })} 
                                        /> 
                                      <Label htmlFor="daily-digest">Daily Digest</Label>
                                  </div>
                              </div>
                          </Card>
                      </div>
                  </div>                </CardContent>
              </Card>
          </TabsContent>
          
          {/* TAB 5: Appearance */}
          <TabsContent value="appearance">
              <Card className="rounded-lg mb-3">
                <CardContent>
                  <h6 className="text-lg font-bold mb-4 text-primary">Theme Settings</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <Label htmlFor="theme" className="mb-2 block">Theme</Label>
                          <Select
                              value={formData.theme || "light"}
                              onValueChange={(value) => setFormData({...formData, theme: value})}
                          >
                              <SelectTrigger id="theme">
                                  <SelectValue placeholder="Select theme" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="light">Light</SelectItem>
                                  <SelectItem value="dark">Dark</SelectItem>
                                  <SelectItem value="system">System Default</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div>
                          <Label htmlFor="primary-color" className="mb-2 block">Primary Color</Label>
                          <Input 
                              id="primary-color"
                              type="color"
                              value="#3b82f6" 
                          />
                      </div>
                  </div>
                  
                  <h6 className="text-lg font-bold mb-4 text-primary mt-6">Display Options</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center space-x-2">
                          <Switch 
                              id="compact-mode"
                              checked={formData.compactMode || false} 
                              onCheckedChange={(checked) => setFormData({...formData, compactMode: checked})} 
                          /> 
                          <Label htmlFor="compact-mode">Compact Mode</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <Switch id="auto-collapse-sidebar" defaultChecked /> 
                          <Label htmlFor="auto-collapse-sidebar">Auto-collapse Sidebar</Label>
                      </div>
                  </div>
                  
                  <h6 className="text-lg font-bold mb-4 text-primary mt-6">Language & Localization</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <Label htmlFor="language" className="mb-2 block">Language</Label>
                          <Select
                              value="en"
                              onValueChange={(value) => console.log("Language changed to:", value)} // Placeholder for actual state update
                          >
                              <SelectTrigger id="language">
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
                      <div className="flex items-center space-x-2">
                          <Switch id="show-language-selector" defaultChecked /> 
                          <Label htmlFor="show-language-selector">Show Language Selector</Label>
                      </div>
                  </div>
                </CardContent>
              </Card>
          </TabsContent>
          
          {/* TAB 6: Security */}
          <TabsContent value="security">
              <Card className="rounded-lg mb-3">
                <CardContent>
                  <h6 className="text-lg font-bold mb-4 text-primary">Password Policy</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <Label htmlFor="min-password-length" className="mb-2 block">Minimum Password Length</Label>
                          <Input 
                              id="min-password-length"
                              type="number"
                              value={formData.minPasswordLength || 8} 
                              onChange={(e) => setFormData({...formData, minPasswordLength: parseInt(e.target.value) || 0})} 
                          />
                      </div>
                      <div className="flex items-center space-x-2">
                          <Switch id="require-numbers" defaultChecked /> 
                          <Label htmlFor="require-numbers">Require Numbers</Label>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <div className="flex items-center space-x-2">
                          <Switch id="require-special-chars" defaultChecked /> 
                          <Label htmlFor="require-special-chars">Require Special Characters</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <Switch id="require-uppercase" defaultChecked /> 
                          <Label htmlFor="require-uppercase">Require Uppercase</Label>
                      </div>
                  </div>                  
                  <h6 className="text-lg font-bold mb-4 text-primary mt-6">Session Management</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <Label htmlFor="session-timeout" className="mb-2 block">Session Timeout (minutes)</Label>
                          <Input 
                              id="session-timeout"
                              type="number"
                              value={30} 
                          />
                          <p className="text-sm text-gray-500 mt-1">Session expires after inactivity period</p>
                      </div>
                      <div className="flex items-center space-x-2">
                          <Switch id="enable-two-factor-auth" /> 
                          <Label htmlFor="enable-two-factor-auth">Enable Two-Factor Authentication</Label>
                      </div>
                  </div>                  
                  <h6 className="text-lg font-bold mb-4 text-primary mt-6">Audit & Compliance</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center space-x-2">
                          <Switch id="enable-audit-logging" defaultChecked /> 
                          <Label htmlFor="enable-audit-logging">Enable Audit Logging</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <Switch id="log-user-actions" defaultChecked /> 
                          <Label htmlFor="log-user-actions">Log User Actions</Label>
                      </div>
                  </div>                </CardContent>
              </Card>
          </TabsContent>
          
          {/* TAB 7: Dashboard */}
          <TabsContent value="dashboard">
              <Card className="rounded-lg mb-3">
                <CardContent>
                  <h6 className="text-lg font-bold mb-4 text-primary">Dashboard Widgets</h6>
                  <p className="text-sm text-gray-500 mb-6">Manage which widgets appear on your dashboard and their visibility.</p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Card className="p-4 mb-2 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-bold">Progress Tracking</p>
                            <p className="text-xs text-gray-500">Monitor project progress metrics</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </Card>
                    </div>
                    
                    <div>
                      <Card className="p-4 mb-2 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-bold">Financial Overview</p>
                            <p className="text-xs text-gray-500">Track budget and expenses</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </Card>
                    </div>
                    
                    <div>
                      <Card className="p-4 mb-2 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-bold">Schedule Tracking</p>
                            <p className="text-xs text-gray-500">Monitor timeline and milestones</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </Card>
                    </div>
                    
                    <div>
                      <Card className="p-4 mb-2 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-bold">Quality Metrics</p>
                            <p className="text-xs text-gray-500">Track quality control measures</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </Card>
                    </div>
                    
                    <div>
                      <Card className="p-4 mb-2 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-bold">Resource Allocation</p>
                            <p className="text-xs text-gray-500">Monitor resource utilization</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </Card>
                    </div>
                    
                    <div>
                      <Card className="p-4 mb-2 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-bold">Document Status</p>
                            <p className="text-xs text-gray-500">Track document approvals and reviews</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </Card>
                    </div>
                  </div>                  
                  <h6 className="text-lg font-bold mb-4 text-primary mt-6">Dashboard Behavior</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center space-x-2">
                          <Switch id="auto-refresh-charts" defaultChecked /> 
                          <Label htmlFor="auto-refresh-charts">Auto-refresh Charts</Label>
                      </div>
                      <div>
                          <Label htmlFor="refresh-interval" className="mb-2 block">Refresh Interval (seconds)</Label>
                          <Input 
                              id="refresh-interval"
                              type="number"
                              value={300} 
                          />
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <div>
                          <Label htmlFor="default-view" className="mb-2 block">Default View</Label>
                          <Select
                              value={formData.dashboardDefaultView || "grid"}
                              onValueChange={(value) => setFormData({...formData, dashboardDefaultView: value})}
                          >
                              <SelectTrigger id="default-view">
                                  <SelectValue placeholder="Select view" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="grid">Grid Layout</SelectItem>
                                  <SelectItem value="list">List Layout</SelectItem>
                                  <SelectItem value="compact">Compact Layout</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                          <Switch id="show-charts" defaultChecked /> 
                          <Label htmlFor="show-charts">Show Charts</Label>
                      </div>
                  </div>                </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
};

export default SettingsModule;
