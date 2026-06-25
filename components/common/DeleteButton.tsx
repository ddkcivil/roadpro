import React from 'react';
import { Button } from '~/components/ui/button';
import { Trash2 } from 'lucide-react';
import { UserRole } from '~/types';
import { useAuth } from '~/hooks/useAuth';

interface DeleteButtonProps {
    onClick: () => void;
    disabled?: boolean;
    size?: 'default' | 'sm' | 'lg' | 'icon';
    variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'link' | 'secondary';
    className?: string;
    canDelete?: boolean;
    permissionMessage?: string;
}

/**
 * Reusable delete button with permission checks
 * Eliminates duplication pattern for delete buttons across the app
 */
export const DeleteButton: React.FC<DeleteButtonProps> = ({
    onClick,
    disabled = false,
    size = 'icon',
    variant = 'ghost',
    className = '',
    canDelete = true,
    permissionMessage = 'Only Admin and Project Manager can delete',
}) => {
    const { userRole } = useAuth();
    
    // Check permission if canDelete prop is provided
    const hasPermission = canDelete || userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER;

    const handleClick = () => {
        if (!hasPermission) {
            alert(permissionMessage);
            return;
        }
        onClick();
    };

    return (
        <Button
            type="button"
            variant={variant === 'ghost' ? 'ghost' : variant}
            size={size}
            disabled={disabled || !hasPermission}
            onClick={handleClick}
            className={`text-destructive hover:bg-red-50 ${className}`}
            title={!hasPermission ? permissionMessage : undefined}
        >
            <Trash2 className="w-4 h-4" />
        </Button>
    );
};

export default DeleteButton;
