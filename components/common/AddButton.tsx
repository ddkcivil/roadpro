import React from 'react';
import { Button } from '~/components/ui/button';
import { Plus } from 'lucide-react';

interface AddButtonProps {
    onClick: () => void;
    label?: string;
    variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'link' | 'destructive';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
    disabled?: boolean;
    icon?: React.ReactNode;
}

/**
 * Reusable add row button with "+" icon
 * Eliminates duplication pattern: + button scattered throughout the app
 */
export const AddButton: React.FC<AddButtonProps> = ({
    onClick,
    label = 'Add',
    variant = 'outline',
    size = 'default',
    className = '',
    disabled = false,
    icon,
}) => {
    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            disabled={disabled}
            onClick={onClick}
            className={className}
        >
            {icon || <Plus className="w-4 h-4 mr-2" />}
            {label}
        </Button>
    );
};

export default AddButton;
