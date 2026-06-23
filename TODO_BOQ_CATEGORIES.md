# BOQ Categories Implementation TODO

## Task
Provide BOQ items have predefined categories:
- "Provisional Sum"
- "General Items"
- "Site Clearance"
- "Earthwork"
- "Structure Work"
- "Cross and Side Drainage Works"
- "Road Works"
- "Footpath"
- "Road Furnitures"
- "Junction Improvement"
- "Day Works"

## Files to Update
1. `types.ts` - Add BOQ_CATEGORIES constant
2. `BOQModule.tsx` - Update import logic to use predefined categories
3. `BOQRegistry.tsx` - Update category input to use dropdown

## Status
- [ ] Add BOQ_CATEGORIES to types.ts
- [ ] Update BOQModule.tsx category mapping
- [ ] Update BOQRegistry.tsx category dropdown
