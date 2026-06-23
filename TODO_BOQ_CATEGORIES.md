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
1. `types.ts` - Add BOQ_CATEGORIES constant ✅ DONE
2. `BOQModule.tsx` - Update import logic to use predefined categories ✅ DONE (already using)
3. `BOQRegistry.tsx` - Update category input to use dropdown ✅ DONE (already using)

## Additional Task - Schedule Integration
4. `types.ts` - Add category to ScheduleTask interface ✅ DONE (already implemented)
5. `ScheduleModule.tsx` - Add category selection to activity modal ✅ DONE (just fixed)

## Status
- [x] Add BOQ_CATEGORIES to types.ts
- [x] Update BOQModule.tsx category mapping
- [x] Update BOQRegistry.tsx category dropdown
- [x] Add category to ScheduleTask interface
- [x] Add category selection to ScheduleModule (NEW tasks now include category field)
