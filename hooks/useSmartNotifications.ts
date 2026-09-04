import { useEffect, useRef, useCallback } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { apiService } from '../services/api/apiService';

/**
 * Smart Notification Orchestrator
 * ------------------------------
 * 1. Login notifications  – once per session
 * 2. Staff leave pending  – polls /api/staff?category=leave-requests every 5 min (Admin/Manager)
 * 3. Daily work summary   – once per day (08:00+ local)
 * 4. Scheduled alerts     – minute-tick scheduler (reminders + project deadlines)
 *
 * One-shot events are deduped via localStorage (7-day pruning).
 */

const DEDUPE_KEY = 'roadmaster-smart-notif-seen';
const SCHEDULE_KEY = 'roadmaster-scheduled-reminders';

export interface ScheduledReminder {
  id: string;
  title: string;
  message: string;
  fireAt: string; // ISO timestamp
  priority?: 'low' | 'normal' | 'high' | 'critical';
  type?: 'reminder' | 'alert' | 'task' | 'info';
  recurringDaily?: boolean;
  lastFiredDate?: string;
}

const loadSeen = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(DEDUPE_KEY) || '{}'); } catch { return {}; }
};

const saveSeen = (seen: Record<string, string>) => {
  try {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const pruned = Object.fromEntries(Object.entries(seen).filter(([, ts]) => new Date(ts).getTime() > cutoff));
    localStorage.setItem(DEDUPE_KEY, JSON.stringify(pruned));
  } catch { /* ignore */ }
};




export const loadReminders = (): ScheduledReminder[] => {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    return raw ? (JSON.parse(raw) as ScheduledReminder[]) : [];
  } catch {
    return [];
  }
};

export const useSmartNotifications = (
  isAuthenticated: boolean,
  userRole: string | undefined,
  userName: string,
  userId: string
) => {
  const { addNotification } = useNotifications();
  const seenRef = useRef<Record<string, string>>(loadSeen());

  const hasFired = useCallback((key: string) => !!seenRef.current[key], []);

  const markFired = useCallback((key: string) => {
    seenRef.current[key] = new Date().toISOString();
    saveSeen(seenRef.current);
  }, []);

  const notify = useCallback((n: { title: string; message: string; type?: any; priority?: any }) => {
    addNotification({
      title: n.title,
      message: n.message,
      type: n.type || 'info',
      priority: n.priority || 'normal',
      channel: 'in-app',
    });
  }, [addNotification]);

  // ---- 1. LOGIN NOTIFICATION ----
  useEffect(() => {
    if (!isAuthenticated || !userName || !userId) return;
    const key = `login-${userId}-${todayKey()}-${new Date().getHours() < 12 ? 'am' : 'pm'}`;
    if (hasFired(key)) return;
    markFired(key);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    notify({
      title: `${greeting}, ${userName.split(' ')[0]}`,
      message: `You logged in at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Have a productive day!`,
      type: 'success',
      priority: 'low',
    });
  }, [isAuthenticated, userName, userId, hasFired, markFired, notify]);

  // ---- 2. STAFF LEAVE PENDING (Admin/Manager) ----
  useEffect(() => {
    if (!isAuthenticated || !isManagerRole(userRole)) return;
    let cancelled = false;
    const checkLeaves = async () => {
      try {
        const result = await apiService.getStaffData('leave-requests');
        if (cancelled || !Array.isArray(result)) return;
        const pending = (result as any[]).filter((r: any) => (r.status || '').toLowerCase() === 'pending');
        if (pending.length === 0) return;
        const key = `leave-pending-${todayKey()}-${pending.length}`;
        if (hasFired(key)) return;
        markFired(key);
        notify({
          title: 'Pending Leave Requests',
          message: `${pending.length} staff leave request${pending.length > 1 ? 's' : ''} awaiting approval. Open Staff Management to review.`,
          type: 'warning',
          priority: 'high',
        });
      } catch { /* non-fatal */ }
    };
    checkLeaves();
    const interval = setInterval(checkLeaves, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isAuthenticated, userRole, hasFired, markFired, notify]);

  // ---- 3. DAILY WORK SUMMARY (after 08:00 local, once per day) ----
  useEffect(() => {
    if (!isAuthenticated || !userName || !userId) return;
    const key = `daily-summary-${userId}-${todayKey()}`;
    if (hasFired(key)) return;
    const now = new Date();
    if (now.getHours() < 8) return;
    markFired(key);

    const buildSummary = async () => {
      let projectCount = 0;
      let activeProjects = 0;
      try {
        const res = await apiService.getProjects(1, 100);
        const projects = res?.data || [];
        projectCount = projects.length;
        activeProjects = projects.filter((p: any) => (p.status || '').toLowerCase() !== 'completed').length;
      } catch { /* non-fatal */ }

      let pendingLeaves = 0;
      if (isManagerRole(userRole)) {
        try {
          const res = await apiService.getStaffData('leave-requests');
          pendingLeaves = ((Array.isArray(res) ? res : []) as any[]).filter((r: any) => (r.status || '').toLowerCase() === 'pending').length;
        } catch { /* non-fatal */ }
      }

      const parts: string[] = [
        `You have ${activeProjects || projectCount} active project${(activeProjects || projectCount) !== 1 ? 's' : ''}.`,
      ];
      if (pendingLeaves > 0) parts.push(`${pendingLeaves} leave request${pendingLeaves > 1 ? 's' : ''} pending approval.`);
      else parts.push('No pending action items — all clear.');

      notify({ title: 'Daily Work Summary', message: parts.join(' '), type: 'update', priority: 'normal' });
    };
    buildSummary();
  }, [isAuthenticated, userName, userId, userRole, hasFired, markFired, notify]);

  // ---- 4. SCHEDULED ALERTS (minute-tick scheduler) ----
  useEffect(() => {
    if (!isAuthenticated) return;

    const tick = () => {
      const reminders = loadReminders();
      if (reminders.length === 0) return;
      const now = Date.now();
      let changed = false;

      for (const r of reminders) {
        if (r.recurringDaily) {
          const today = todayKey();
          if (r.lastFiredDate === today) continue;
          const fireTime = new Date(r.fireAt);
          const scheduledToday = new Date();
          scheduledToday.setHours(fireTime.getHours(), fireTime.getMinutes(), 0, 0);
          if (now >= scheduledToday.getTime()) {
            notify({ title: r.title, message: r.message, type: r.type, priority: r.priority });
            r.lastFiredDate = today;
            changed = true;
          }
        } else if (now >= new Date(r.fireAt).getTime()) {
          notify({ title: r.title, message: r.message, type: r.type, priority: r.priority });
          r.fireAt = ''; // mark for removal
          changed = true;
        }
      }
      if (changed) saveReminders(reminders.filter(r => r.fireAt !== ''));
    };

    // Public scheduling API for other modules / console:
    (window as any).roadmasterScheduleAlert = (opts: Omit<ScheduledReminder, 'lastFiredDate'>) => {
      const reminders = loadReminders();
      reminders.push({
        priority: 'normal',
        type: 'reminder',
        ...opts,
        id: opts.id || `rem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        lastFiredDate: undefined,
      });
      saveReminders(reminders);
    };
    (window as any).roadmasterListAlerts = () => loadReminders();
    (window as any).roadmasterCancelAlert = (id: string) => {
      saveReminders(loadReminders().filter(r => r.id !== id));
    };

    tick();
    const interval = setInterval(tick, 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, notify]);

  // ---- 5. PROJECT DEADLINE ALERTS (daily, due within 7 days) ----
  useEffect(() => {
    if (!isAuthenticated) return;
    const checkDeadlines = async () => {
      const key = `deadlines-${todayKey()}`;
      if (hasFired(key)) return;
      try {
        const res = await apiService.getProjects(1, 100);
        const projects = res?.data || [];
        const now = new Date();
        const urgent: string[] = [];
        for (const p of projects as any[]) {
          const deadline = p.endDate || p.end_date || p.deadline;
          if (!deadline) continue;
          const daysLeft = Math.ceil((new Date(deadline).getTime() - now.getTime()) / 86400000);
          if (daysLeft >= 0 && daysLeft <= 7 && (p.status || '').toLowerCase() !== 'completed') {
            urgent.push(`${p.name} (${daysLeft === 0 ? 'today' : `${daysLeft} day${daysLeft > 1 ? 's' : ''}`})`);
          }
        }
        markFired(key);
        if (urgent.length === 0) return;
        notify({
          title: 'Upcoming Project Deadlines',
          message: `${urgent.length} project${urgent.length > 1 ? 's' : ''} due within 7 days: ${urgent.join(', ')}.`,
          type: 'alert',
          priority: 'critical',
        });
      } catch { /* non-fatal */ }
    };
    checkDeadlines();
  }, [isAuthenticated, hasFired, markFired, notify]);

  // Cleanup global scheduler API
  useEffect(() => {
    return () => {
      delete (window as any).roadmasterScheduleAlert;
      delete (window as any).roadmasterListAlerts;
      delete (window as any).roadmasterCancelAlert;
    };
  }, []);
};

export const saveReminders = (reminders: ScheduledReminder[]) => {
  try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(reminders)); } catch { /* ignore */ }
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const isManagerRole = (userRole: string | undefined): boolean => {
  if (!userRole) return false;
  const role = userRole.toLowerCase();
  return role === 'admin' || role === 'manager' || role === 'project_manager' || role === 'project manager';
};

