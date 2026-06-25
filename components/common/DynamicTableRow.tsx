import React from 'react';
import { TableCell, TableRow } from '~/components/ui/table';
import { DeleteButton } from './DeleteButton';

interface DynamicTableRowProps<T> {
    item: T;
    index: number;
    columns: Array<{
        key: keyof T;
        render?: (value: any, item: T, index: number) => React.ReactNode;
        input?: {
            type?: 'text' | 'number' | 'select';
            placeholder?: string;
            options?: Array<{ value: string; label: string }>;
            onChange?: (value: any, item: T, index: number) => void;
        };
    }>;
    onDelete: (index: number) => void;
    onUpdate: (index: number, field: keyof T, value: any) => void;
    canDelete?: boolean;
    showDelete?: boolean;
}

/**
 * Reusable dynamic table row component
 * Eliminates duplication for Plant Equipment, Materials, Personnel table rows
 */
export function DynamicTableRow<T extends Record<string, any>>(props: DynamicTableRowProps<T>) {
    const { item, index, columns, onDelete, onUpdate, canDelete = true, showDelete = true } = props;

    return (
        <TableRow key={item.id || index}>
            {columns.map((col) => (
                <TableCell key={String(col.key)}>
                    {col.render ? (
                        col.render(item[col.key], item, index)
                    ) : col.input ? (
                        col.input.type === 'select' ? (
                            <select
                                value={item[col.key] || ''}
                                onChange={(e) => onUpdate(index, col.key, e.target.value)}
                                title={col.input.placeholder || 'Select option'}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">{col.input.placeholder || 'Select...'}</option>
                                {col.input.options?.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type={col.input.type || 'text'}
                                value={item[col.key] || ''}
                                placeholder={col.input.placeholder || ''}
                                onChange={(e) => {
                                    const value = col.input?.type === 'number' 
                                        ? Number(e.target.value) 
                                        : e.target.value;
                                    onUpdate(index, col.key, value);
                                }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        )
                    ) : (
                        <span>{item[col.key]}</span>
                    )}
                </TableCell>
            ))}
            {showDelete && (
                <TableCell>
                    <DeleteButton
                        onClick={() => onDelete(index)}
                        canDelete={canDelete}
                        permissionMessage="Only Admin and Project Manager can delete"
                    />
                </TableCell>
            )}
        </TableRow>
    );
}

export default DynamicTableRow;
