import React from 'react';
import { Permission } from '../../types';
import { HasPermission } from './HasPermission';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface ProtectedTabProps {
  permission: Permission;
  children: React.ReactNode;
}

/**
 * A wrapper for application tabs that require specific permissions.
 * Displays an access denied message if the user lacks the required permission.
 */
export const ProtectedTab: React.FC<ProtectedTabProps> = ({ permission, children }) => {
  return (
    <HasPermission 
      permission={permission} 
      fallback={
        <div className="flex items-center justify-center h-full p-8">
          <Alert variant="destructive" className="max-w-md">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have the required permissions ({permission}) to view this module. 
              Please contact your administrator if you believe this is an error.
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      {children}
    </HasPermission>
  );
};
