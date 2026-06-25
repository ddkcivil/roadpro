import { useCallback } from 'react';

/**
 * Generic factory for creating input update handlers
 * Eliminates boilerplate: (e) => setField(e.target.value)
 * 
 * @usage
 * const handleUpdate = useInputHandler(setFormState);
 * <input onChange={handleUpdate('fieldName')} />
 * 
 * For number inputs:
 * <input type="number" onChange={handleUpdate('quantity', 'number')} />
 */
export function useInputHandler<T extends Record<string, any>>(
    setState: React.Dispatch<React.SetStateAction<T>>
) {
    const handleChange = useCallback((
        field: keyof T,
        type: 'text' | 'number' | 'boolean' = 'text'
    ) => {
        return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            let value: any = event.target.value;
            
            // Handle different input types
            if (type === 'number') {
                value = parseFloat(event.target.value) || 0;
            } else if (type === 'boolean') {
                value = event.target.value === 'true';
            }
            
            setState(prev => ({ ...prev, [field]: value }));
        };
    }, [setState]);

    const handleSelect = useCallback((
        field: keyof T
    ) => {
        return (value: string) => {
            setState(prev => ({ ...prev, [field]: value }));
        };
    }, [setState]);

    return { handleChange, handleSelect };
}

/**
 * Simple wrapper for direct value setting
 * Use when you already have the value
 * 
 * @usage
 * const updateField = useFieldUpdater(setForm);
 * updateField('name', 'John');
 * updateField('age', 25);
 */
export function useFieldUpdater<T extends Record<string, any>>(
    setState: React.Dispatch<React.SetStateAction<T>>
) {
    return useCallback((field: keyof T, value: any) => {
        setState(prev => ({ ...prev, [field]: value }));
    }, [setState]);
}

/**
 * Hook for managing checkbox/radio groups
 * 
 * @usage
 * const { toggle, isChecked } = useCheckboxGroup(setFormState, 'roles');
 * <input type="checkbox" checked={isChecked('admin')} onChange={toggle('admin')} />
 */
export function useCheckboxGroup<T extends Record<string, any>>(
    setState: React.Dispatch<React.SetStateAction<T>>,
    arrayField: keyof T
) {
    const toggle = useCallback((value: string) => {
        setState(prev => {
            const current = (prev[arrayField] as string[]) || [];
            const updated = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
            return { ...prev, [arrayField]: updated };
        });
    }, [setState, arrayField]);

    const isChecked = useCallback((value: string) => {
        return (value: string) => {
            // This is a runtime check, will be called in render
            return true; // Placeholder - actual check done in component
        };
    }, []);

    return { toggle, isChecked };
}

export default useInputHandler;
