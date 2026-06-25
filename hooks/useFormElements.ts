import { useCallback } from 'react';
import { useArrayUpdater } from './useArrayUpdater';

/**
 * Specialized hook for form element arrays like visitors, remarks, etc.
 * Provides standardized add/remove/update patterns
 * 
 * @usage
 * const { items, updateField, removeItem, addItem, replaceAll } = useFormElements<Visitor>(defaultVisitor);
 */
export function useFormElements<T extends Record<string, any>>(
    getDefaultItem: () => T
) {
    const { 
        array: items, 
        setArray: setItems, 
        updateAt, 
        removeAt, 
        addNew,
        replace
    } = useArrayUpdater<T>([getDefaultItem()], getDefaultItem);

    /**
     * Update a single field for an item at index
     * @param index - Array index
     * @param field - Field name
     * @param value - New value
     */
    const updateField = useCallback((index: number, field: keyof T, value: any) => {
        updateAt(index, field, value);
    }, [updateAt]);

    /**
     * Remove item at index (with safety check for minimum items)
     * @param index - Index to remove
     * @param minItems - Minimum number of items to keep (default: 1)
     */
    const removeItem = useCallback((index: number, minItems: number = 1) => {
        if (items.length > minItems) {
            removeAt(index);
        }
    }, [items.length, removeAt]);

    /**
     * Add a new item to the form
     */
    const addItem = useCallback(() => {
        addNew();
    }, [addNew]);

    /**
     * Replace all items with new array
     */
    const replaceAll = useCallback((newItems: T[]) => {
        replace(newItems);
    }, [replace]);

    /**
     * Check if item at index has any data
     */
    const hasData = useCallback((index: number) => {
        const item = items[index];
        return Object.values(item).some(v => v !== '' && v !== 0 && v !== null && v !== undefined);
    }, [items]);

    return {
        items,
        setItems,
        updateField,
        removeItem,
        addItem,
        replaceAll,
        hasData,
        count: items.length,
    };
}

export default useFormElements;
