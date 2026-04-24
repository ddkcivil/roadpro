import { BOQItem } from '../types';

export const calculateProgress = (boq?: BOQItem[]) => {
  if (!boq || boq.length === 0) return 0;
  const total = boq.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  const earned = boq.reduce((acc, item) => acc + (item.completedQuantity * item.rate), 0);
  return total > 0 ? Math.round((earned / total) * 100) : 0;
};

export const calculateTimeProgress = (start: string, end: string) => {
  if (!start || !end) return 0;
  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();
  const today = new Date().getTime();
  
  if (today <= startDate) return 0;
  if (today >= endDate) return 100;
  
  const total = endDate - startDate;
  const elapsed = today - startDate;
  return total > 0 ? Math.round((elapsed / total) * 100) : 0;
};

export const calculateDuration = (start: string, end: string) => {
  if (!start || !end) return "N/A";
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = Math.abs(e.getTime() - s.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 365) return `${(diffDays / 365).toFixed(1)} Yrs`;
  if (diffDays > 30) return `${Math.round(diffDays / 30)} Mos`;
  return `${diffDays} Days`;
};

export enum ProjectStatusLabel {
  PLANNED = 'Planned',
  DRAFT = 'Draft',
  UPCOMING = 'Upcoming',
  ACTIVE = 'Active',
  COMPLETED = 'Completed'
}

export const getProjectStatusType = (start: string, end: string) => {
  const timeProgress = calculateTimeProgress(start, end);
  if (!start) return ProjectStatusLabel.DRAFT;
  if (timeProgress === 0) return ProjectStatusLabel.UPCOMING;
  if (timeProgress === 100) return ProjectStatusLabel.COMPLETED;
  return ProjectStatusLabel.ACTIVE;
};
