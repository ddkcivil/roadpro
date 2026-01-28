// Utility functions for document management and blob URL handling

import { Project, ProjectDocument } from '../types';

/**
 * Handle expired blob URLs by marking documents as unavailable
 * @param previewDoc - The document that failed to load
 * @param project - Current project data
 * @param onProjectUpdate - Function to update project data
 * @param setPreviewDoc - Function to update preview document state
 */
export const handleExpiredBlobUrl = (
  previewDoc: ProjectDocument,
  project: Project,
  onProjectUpdate: (project: Project) => void,
  setPreviewDoc: (doc: ProjectDocument | null) => void
) => {
  console.log('Detected expired blob URL, marking document as unavailable...');
  
  // Update the document to mark it as unavailable
  const updatedDocs = (project.documents || []).map(doc => 
    doc.id === previewDoc.id 
      ? { ...doc, status: 'Unavailable' as const, fileUrl: undefined } 
      : doc
  );
  
  onProjectUpdate({ ...project, documents: updatedDocs });
  setPreviewDoc(previewDoc ? { ...previewDoc, status: 'Unavailable', fileUrl: undefined } : null);
};

/**
 * Check if a URL is an expired blob URL
 * @param url - The URL to check
 * @returns boolean indicating if it's an expired blob URL
 */
export const isExpiredBlobUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.startsWith('blob:') && !url.startsWith('data:');
};

/**
 * Convert base64 data to blob URL
 * @param base64 - Base64 encoded data
 * @returns Blob URL or empty string on error
 */
export const base64ToBlobUrl = (base64: string): string => {
  try {
    const byteString = atob(base64.split(',')[1]);
    const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error converting base64 to blob URL:', error);
    return '';
  }
};

/**
 * Convert File to base64
 * @param file - File object to convert
 * @returns Promise resolving to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};