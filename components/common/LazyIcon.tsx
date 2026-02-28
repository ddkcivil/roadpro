import React, { lazy, Suspense, useMemo } from 'react';
import { LucideProps, Loader2 } from 'lucide-react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';

interface LazyIconProps extends Omit<LucideProps, 'ref'> {
  name: keyof typeof dynamicIconImports;
}

/**
 * A component that lazily loads Lucide icons.
 * Useful for icons that are not part of the core UI but needed dynamically (e.g., from a database).
 */
export const LazyIcon: React.FC<LazyIconProps> = ({ name, ...props }) => {
  const Icon = useMemo(() => lazy(dynamicIconImports[name]), [name]);

  return (
    <Suspense fallback={<Loader2 className="animate-spin" size={props.size || 24} />}>
      <Icon {...props} />
    </Suspense>
  );
};
