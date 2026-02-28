import React from 'react';
import { useNotifications, NotificationType, NotificationChannel } from '~/contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { Separator } from '~/components/ui/separator';
import { Bell, Mail, Smartphone, Globe, ShieldAlert, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { Button } from '~/components/ui/button';

export const NotificationSettings: React.FC = () => {
  const { preferences, updatePreferences, requestPushPermission } = useNotifications();

  const toggleType = (type: NotificationType) => {
    const newTypes = preferences.types.includes(type)
      ? preferences.types.filter(t => t !== type)
      : [...preferences.types, type];
    updatePreferences({ types: newTypes });
  };

  const toggleChannel = (channel: NotificationChannel) => {
    if (channel === 'push' && !preferences.channels.includes('push')) {
      requestPushPermission();
      return;
    }
    const newChannels = preferences.channels.includes(channel)
      ? preferences.channels.filter(c => c !== channel)
      : [...preferences.channels, channel];
    updatePreferences({ channels: newChannels });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Global Notifications</CardTitle>
          </div>
          <CardDescription>
            Master switch for all system notifications and alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Notifications</Label>
            <p className="text-xs text-muted-foreground">Receive real-time updates about your projects.</p>
          </div>
          <Switch 
            checked={preferences.enabled} 
            onCheckedChange={(val) => updatePreferences({ enabled: val })} 
          />
        </CardContent>
      </Card>

      <Card className={!preferences.enabled ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="text-base font-bold">Delivery Channels</CardTitle>
          <CardDescription>How you want to receive your alerts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Label>In-App Dashboard</Label>
            </div>
            <Switch 
              checked={preferences.channels.includes('in-app')} 
              onCheckedChange={() => toggleChannel('in-app')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label>Browser Push</Label>
                <p className="text-[10px] text-muted-foreground">Native OS notifications via browser.</p>
              </div>
            </div>
            <Switch 
              checked={preferences.channels.includes('push')} 
              onCheckedChange={() => toggleChannel('push')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label>Email Digest</Label>
            </div>
            <Switch 
              checked={preferences.channels.includes('email')} 
              onCheckedChange={() => toggleChannel('email')}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={!preferences.enabled ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="text-base font-bold">Event Subscriptions</CardTitle>
          <CardDescription>Select which events trigger a notification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <Label>Success Confirmations</Label>
            </div>
            <Switch 
              checked={preferences.types.includes('success')} 
              onCheckedChange={() => toggleType('success')}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <Label>Critical Errors</Label>
            </div>
            <Switch 
              checked={preferences.types.includes('error')} 
              onCheckedChange={() => toggleType('error')}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <Label>Warning Alerts</Label>
            </div>
            <Switch 
              checked={preferences.types.includes('warning')} 
              onCheckedChange={() => toggleType('warning')}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="h-4 w-4 text-blue-500" />
              <Label>System Information</Label>
            </div>
            <Switch 
              checked={preferences.types.includes('info')} 
              onCheckedChange={() => toggleType('info')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
