import React from 'react';
import { Project, BOQItem, StructureComponent } from '../../types';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

interface Props {
  project: Project;
  component: StructureComponent;
  onUpdate: (updatedComponent: StructureComponent) => void;
}

const StructuralBOQLinker: React.FC<Props> = ({ project, component, onUpdate }) => {
  const boqItems = project.boq || [];

  return (
    <div className="grid gap-2">
      <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Link to BOQ Item</Label>
      <Select 
        value={component.boqItemId || 'none'} 
        onValueChange={(value: string) => onUpdate({ 
          ...component, 
          boqItemId: value === 'none' ? undefined : value 
        })}
      >
        <SelectTrigger className="rounded-xl h-10">
          <SelectValue placeholder="Select BOQ Item..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {boqItems.map(item => (
            <SelectItem key={item.id} value={item.id}>
              {item.itemNo} - {item.description}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default StructuralBOQLinker;
