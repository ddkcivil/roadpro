# BOQ Categories Implementation Plan

## Task
Add predefined BOQ categories for better consistency in Bill of Quantity items.

## Categories
1. Provisional Sum
2. General Items
3. Site Clearance
4. Earthwork
5. Structure Work
6. Cross and Side Drainage Works
7. Road Works
8. Footpath
9. Road Furnitures
10. Junction Improvement
11. Day Works

## Implementation Steps

### Step 1: Add BOQ_CATEGORIES constant to types.ts
- Add an exported constant array with all predefined categories

### Step 2: Update BOQModule.tsx
- Update import logic to map incoming category values to predefined list
- Add category normalization/cleaning

### Step 3: Update BOQRegistry.tsx
- Replace text input with dropdown select
- Use predefined categories as options
- Keep backward compatibility

## Files to Edit
1. types.ts
2. components/modules/BOQModule.tsx
3. components/modules/BOQRegistry.tsx
