# Unused Imports Report

## Summary
- **Total Errors**: 301 errors across 68 files
- **Error Codes**: 
  - TS6133: Import/variable declared but never read
  - TS6192: All imports in declaration are unused
  - TS6196: Variable declared but never used

## Files with Unused Imports

### api/
1. **api/_utils/csrf.ts** (1 error)
   - `TOKEN_SECRET` is declared but never used

### components/common/
2. **components/common/OfflineIndicator.tsx** (1 error)
   - `Separator` is imported but never used

3. **components/common/UserManagement.tsx** (5 errors)
   - `useMemo` from 'react' - never used
   - `Save` from 'lucide-react' - never used
   - `GripVertical` from 'lucide-react' - never used
   - `DialogTrigger` from dialog - never used
   - `Checkbox` - never used

4. **components/common/UserRegistration.tsx** (8 errors)
   - `ChangeEvent` from 'react' - never used
   - `Mail`, `Shield`, `Edit3`, `Save` from 'lucide-react' - never used
   - `CardContent` - never used
   - All Dialog imports - never used
   - `cn` from utils - never used

### components/core/
5. **components/core/AboutPage.tsx** (6 errors)
   - `Mail`, `Phone` from 'lucide-react' - never used
   - `CardHeader`, `CardTitle` - never used
   - `AvatarFallback` - never used
   - `cn` - never used

6. **components/core/AppHeader.test.tsx** (1 error)
   - `React` - never used

7. **components/core/AppHeader.tsx** (11 errors)
   - `useState`, `useEffect` from 'react' - never used
   - `ChevronRight`, `ChevronLeft`, `Loader2`, `CloudCog` from 'lucide-react' - never used
   - `Wifi`, `WifiOff` - never used
   - `Toggle` - never used
   - `isSidebarCollapsed`, `setIsSidebarCollapsed` - never used

8. **components/core/AppSidebar.tsx** (8 errors)
   - `memo`, `startTransition` from 'react' - never used
   - `ChevronLeft`, `ChevronRight` - never used
   - `Separator` - never used
   - `TooltipProvider` - never used
   - `setIsSidebarCollapsed` - never used
   - `currentUser` - never used

9. **components/core/Dashboard.tsx** (27 errors)
   - `Legend` from 'recharts' - never used
   - `StatCard` - never used
   - All exports from `exportUtils` - never used
   - `generateBOQPDF`, `generateStructuresPDF`, `generateRFIPDF` - never used
   - `WeatherWidget` - never used
   - Multiple lucide-react icons: `CheckCircle`, `Sun`, `Wind`, `Droplets`, `FileText`, `ChevronDown`, `ChevronUp`, `Check`, `ClipboardCheck` - never used
   - `Tooltip`, `TooltipContent`, `TooltipTrigger` - never used
   - `cn` - never used
   - `onUpdateProject`, `isLoading` props - never used

10. **components/core/DataAnalysisModule.tsx** (6 errors)
    - `CardHeader`, `CardTitle` - never used
    - `Input`, `Label` - never used
    - `cn` - never used
    - `loading` variable - never used

11. **components/core/Login.test.tsx** (2 errors)
    - `React` - never used
    - `submitButton` variable - never used

12. **components/core/Login.tsx** (11 errors)
    - `UserWithPermissions` from types - never used
    - `UserPlus`, `Briefcase`, `ChevronRight` - never used
    - `CardDescription`, `CardHeader`, `CardTitle` - never used
    - `AlertTitle` - never used

13. **components/core/NotificationsBadge.tsx** (6 errors)
    - `useState` - never used
    - `Badge` - never used
    - `DropdownMenuItem`, `DropdownMenuSeparator` - never used
    - `Separator` - never used
    - All Tooltip imports - never used

14. **components/core/PortfolioDashboard.tsx** (10 errors)
    - `useMemo` - never used
    - `Plus`, `DollarSign`, `Calendar`, `LineChart` - never used
    - `CardHeader`, `CardTitle` - never used
    - `Separator` - never used
    - All Dialog imports - never used
    - `onSaveProject` prop - never used

15. **components/core/ProjectModal.tsx** (5 errors)
    - All Alert imports - never used
    - `AlertCircle` - never used
    - `ProjectFormData` type - never used

16. **components/core/ProjectSelector.tsx** (5 errors)
    - `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle` - never used
    - `cn` - never used

17. **components/core/ProjectsList.tsx** (5 errors)
    - `useCallback` - never used
    - `Separator` - never used
    - `List` (react-window) - never used
    - `AutoSizer` - never used
    - `userRole` prop - never used

18. **components/core/ProjectsListSkeleton.tsx** (1 error)
    - `CardContent` - never used

19. **components/core/StatCard.test.tsx** (1 error)
    - `React` - never used

20. **components/core/StatCard.tsx** (1 error)
    - `Shimmer` - never used

21. **components/core/WeatherWidget.tsx** (2 errors)
    - `React` - never used
    - `weather.forecast` possibly undefined

### components/hubs/
22. **components/hubs/FinancialsCommercialHub.tsx** (6 errors)
    - `Calendar` - never used
    - `AgencyBill` - never used
    - `DialogTrigger` - never used
    - `onProjectUpdate`, `userRole` props - never used

23. **components/hubs/QualityHub.tsx** (3 errors)
    - All Alert imports - never used
    - `CollapsibleContent` - never used

24. **components/hubs/ReportsAnalyticsHub.tsx** (2 errors)
    - `X` - never used
    - `NCR` - never used

### components/modules/
25. **components/modules/AssetsModule.tsx** (1 error)
    - `Fuel` - never used

26. **components/modules/BOQManager.tsx** (2 errors)
    - `userRole` prop - never used
    - `isPending` variable - never used

27. **components/modules/BOQModule.tsx** (2 errors)
    - `Search` - never used
    - `isPending` variable - never used

28. **components/modules/CommentsPanel.tsx** (3 errors)
    - `Input`, `Label` - never used
    - `cn` - never used

29. **components/modules/ConstructionModule.tsx** (5 errors)
    - `Trash2`, `Edit` - never used
    - All Tooltip imports - never used
    - `handleEditStructure` function - never used
    - `handleDeleteStructure` function - never used

30. **components/modules/DocumentsModule.tsx** (3 errors)
    - `User` - never used
    - `File` - never used
    - All Tooltip imports - never used

31. **components/modules/PavementModule.tsx** (5 errors)
    - `CardHeader`, `CardTitle` - never used
    - `DialogDescription`, `DialogTrigger` - never used
    - `TabsContent` - never used

32. **components/modules/PreConstructionModule.tsx** (14 errors)
    - `Bell`, `Clock`, `MapPin`, `Filter`, `Search`, `ChevronDown` - never used
    - `CardHeader`, `CardTitle` - never used
    - `DialogDescription`, `DialogTrigger` - never used
    - All Table imports - never used
    - All Tabs imports - never used
    - All Tooltip imports - never used
    - `Separator` - never used

33. **components/modules/ResourceManagementHub.tsx** (17 errors)
    - All Dialog imports - never used
    - `CheckCircle2` - never used
    - `onProjectUpdate`, `userRole` props - never used
    - Multiple state variables: `isInventoryModalOpen`, `inventoryForm`, `editingItemId`, `isMaterialModalOpen`, `editingMaterialId`, `materialForm`, `isPoModalOpen`, `isPoDetailOpen`, `setIsPoDetailOpen`, `selectedPoId`, `setSelectedPoId`, `poForm`, `setPoForm` - never used

34. **components/modules/ResourceMatrixModule.tsx** (14 errors)
    - `CardContent`, `CardHeader`, `CardTitle` - never used
    - `ShadcnTableHead` - never used
    - `TabsContent` - never used
    - `X`, `Calendar`, `AlertTriangle`, `CheckCircle`, `Clock` - never used
    - `allocationTab`, `setAllocationTab` - never used
    - `getStatusColor`, `getCriticalityColor` functions - never used

35. **components/modules/RFIModule.tsx** (2 errors)
    - `CardContent` - never used
    - `Eye` - never used

36. **components/modules/ScheduleModule.tsx** (9 errors)
    - `ChevronLeft`, `ChevronRight` - never used
    - `GripVertical` - never used
    - All Card imports - never used
    - `TableHeader` - never used
    - `DialogDescription`, `DialogTrigger` - never used
    - `Separator` - never used
    - `TabsContent` - never used

37. **components/modules/SettingsModule.tsx** (4 errors)
    - `AvatarImage` - never used
    - `Slider` - never used
    - `Mail`, `AlertCircle` - never used

38. **components/modules/StaffManagementModule.tsx** (1 error)
    - `CardTitle` - never used

39. **components/modules/SubcontractorModule.tsx** (13 errors)
    - `useMemo` - never used
    - `BOQItem`, `AgencyRateEntry` - never used
    - All Card imports - never used
    - `AvatarFallback` - never used
    - `TableHeader` - never used
    - `TabsContent` - never used
    - `Progress` - never used
    - `MapPin`, `Clock` - never used
    - `CheckCircle2`, `Package` - never used
    - `userRole` prop - never used

40. **components/modules/VariationModule.tsx** (1 error)
    - All Tabs imports - never used

### components/ui/
41. **components/ui/collapsible.tsx** (1 error)
    - `React` - never used

42. **components/ui/filter-panel.tsx** (1 error)
    - `onClearGroup` prop - never used

43. **components/ui/progress.tsx** (1 error)
    - `props` parameter - never used

44. **components/ui/sheet.tsx** (1 error)
    - `VariantProps` - never used

### config/
45. **config/navigation.ts** (1 error)
    - `Mail` - never used

### hooks/
46. **hooks/useAuth.ts** (1 error)
    - `UserWithPermissions` - never used

47. **hooks/useMessages.ts** (1 error)
    - `startTransition` - never used

48. **hooks/usePersistence.ts** (2 errors)
    - `useCallback`, `useRef` - never used

49. **hooks/useProjects.ts** (1 error)
    - `useRateLimit` - imported but never used

### services/ai/
50. **services/ai/aiSchedulingService.ts** (1 error)
    - `currentUser` parameter - never used

51. **services/ai/deepseekService.ts** (2 errors)
    - `photoBase64`, `category` parameters - never used

52. **services/ai/geminiService.ts** (4 errors)
    - `formatCurrency` - never used
    - `schedule` parameter - never used
    - `isFastMode` parameter - never used
    - `useSearch` parameter - never used

53. **services/ai/imageRecognitionService.ts** (12 errors)
    - `StructureAsset`, `LabTest`, `BOQItem`, `ScheduleTask` - never used
    - `project` parameter in multiple methods - never used
    - `detectedObjects` parameter - never used
    - `photo` parameter in multiple methods - never used

### services/analytics/
54. **services/analytics/anomalyDetectionService.ts** (12 errors)
    - `ScheduleTask`, `BOQItem`, `Vehicle`, `LabTest`, `RFI`, `NCR`, `WeatherInfo`, `DailyReport`, `VehicleLog`, `StructureAsset` - never used
    - `anomalyId`, `status` parameters - never used

55. **services/analytics/auditService.ts** (2 errors)
    - `User`, `Project` - never used

56. **services/analytics/predictiveAnalyticsService.ts** (5 errors)
    - `BOQItem`, `LabTest`, `RFI`, `NCR`, `WeatherInfo` - never used

57. **services/analytics/reportingService.ts** (1 error)
    - `BOQItem` - never used

### services/api/
58. **services/api/realApiService.ts** (2 errors)
    - `Message`, `AppSettings` - never used

### services/database/
59. **services/database/dataSyncService.ts** (1 error)
    - All type imports - never used

60. **services/database/sqliteService.ts** (1 error)
    - `file` parameter - never used

### utils/
61. **utils/data/localStorageUtils.ts** (1 error)
    - `isNearQuota` function - never used

62. **utils/data/offlineUtils.ts** (1 error)
    - `Project` - never used

63. **utils/formatting/currencyUtils.test.ts** (1 error)
    - `formatCurrencyWithDecimals` - never used

64. **utils/formatting/i18nUtils.ts** (2 errors)
    - `language` parameter - never used
    - `currencyCode` parameter - never used

65. **utils/formatting/mprPDFGenerator.ts** (3 errors)
    - `Milestone` - never used
    - `MilestoneWithDates` interface - never used
    - `accentColor` variable - never used

66. **utils/formatting/pdfUtils.ts** (8 errors)
    - `index` variable in multiple forEach loops - never used

67. **utils/migration/migrationUtils.ts** (1 error)
    - `dataPreserved` variable - never used

### Root files/
68. **App.test.tsx** (1 error)
    - `React` - never used

## Recommendation

To fix these unused imports, you can:

1. **Manually remove unused imports** from each file
2. **Use an IDE** like VS Code with TypeScript support - it usually highlights unused imports in gray and provides quick fixes
3. **Consider adding ESLint** with `no-unused-imports` rule for automatic detection and fixing

The project already has TypeScript's `noUnusedLocals` and `noUnusedParameters` enabled in tsconfig.json, so these issues will continue to be flagged during development.
