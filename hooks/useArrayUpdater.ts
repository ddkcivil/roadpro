import { useState, useCallback } from 'react';

/**
 * Generic hook for array CRUD operations
 * Eliminates duplication pattern: const updated = [...array]; updated[index].prop = value; setArray(updated)
 * 
 * @usage
 * const { array, setArray, updateAt, removeAt, addNew } = useArrayUpdater<T>(initialValue);
 */
export function useArrayUpdater<T extends Record<string, any>>(
    initialValue: T[] = [],
    getDefaultItem?: () => T
) {
    const [array, setArray] = useState<T[]>(initialValue);

    /**
     * Update a single property at index
     * @param index - Array index to update
     * @param field - Property name to update
     * @param value - New value for the property
     */
    const updateAt = useCallback((index: number, field: keyof T, value: any) => {
        setArray(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }, []);

    /**
     * Update multiple properties at index
     * @param index - Array index to update
     * @param changes - Object containing properties to update
     */
    const updateItem = useCallback((index: number, changes: Partial<T>) => {
        setArray(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...changes };
            return updated;
        });
    }, []);

    /**
     * Remove item at index
     * @param index - Array index to remove
     */
    const removeAt = useCallback((index: number) => {
        setArray(prev => prev.filter((_, i) => i !== index));
    }, []);

    /**
     * Add a new item to the array
     * @param item - Optional new item, or use getDefaultItem() if provided
     */
    const addNew = useCallback((item?: T) => {
        setArray(prev => [...prev, item || getDefaultItem?.() || {} as T]);
    }, [getDefaultItem]);

    /**
     * Insert item at specific index
     * @param index - Index to insert at
     * @param item - Item to insert
     */
    const insertAt = useCallback((index: number, item: T) => {
        setArray(prev => {
            const updated = [...prev];
            updated.splice(index, 0, item);
            return updated;
        });
    }, []);

    /**
     * Replace entire array
     * @param newArray - New array value
     */
    const replace = useCallback((newArray: T[]) => {
        setArray(newArray);
    }, []);

    return {
        array,
        setArray,
        updateAt,
        updateItem,
        removeAt,
        addNew,
        insertAt,
        replace,
    };
}

export default useArrayUpdater;
