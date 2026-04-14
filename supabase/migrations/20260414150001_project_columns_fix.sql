-- Migration to fix remaining CamelCase column names in projects table
BEGIN;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'clientname') THEN
    ALTER TABLE public.projects RENAME COLUMN clientname TO "clientName";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'startdate') THEN
    ALTER TABLE public.projects RENAME COLUMN startdate TO "startDate";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'enddate') THEN
    ALTER TABLE public.projects RENAME COLUMN enddate TO "endDate";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'contractperiod') THEN
    ALTER TABLE public.projects RENAME COLUMN contractperiod TO "contractPeriod";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'projectmanager') THEN
    ALTER TABLE public.projects RENAME COLUMN projectmanager TO "projectManager";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'consultantname') THEN
    ALTER TABLE public.projects RENAME COLUMN consultantname TO "consultantName";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'contractno') THEN
    ALTER TABLE public.projects RENAME COLUMN contractno TO "contractNo";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'variationorders') THEN
    ALTER TABLE public.projects RENAME COLUMN variationorders TO "variationOrders";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'labtests') THEN
    ALTER TABLE public.projects RENAME COLUMN labtests TO "labTests";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'agencypayments') THEN
    ALTER TABLE public.projects RENAME COLUMN agencypayments TO "agencyPayments";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'agencymaterials') THEN
    ALTER TABLE public.projects RENAME COLUMN agencymaterials TO "agencyMaterials";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'agencybills') THEN
    ALTER TABLE public.projects RENAME COLUMN agencybills TO "agencyBills";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'subcontractorpayments') THEN
    ALTER TABLE public.projects RENAME COLUMN subcontractorpayments TO "subcontractorPayments";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'linearworks') THEN
    ALTER TABLE public.projects RENAME COLUMN linearworks TO "linearWorks";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'purchaseorders') THEN
    ALTER TABLE public.projects RENAME COLUMN purchaseorders TO "purchaseOrders";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'inventorytransactions') THEN
    ALTER TABLE public.projects RENAME COLUMN inventorytransactions TO "inventoryTransactions";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'vehiclelogs') THEN
    ALTER TABLE public.projects RENAME COLUMN vehiclelogs TO "vehicleLogs";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'sitephotos') THEN
    ALTER TABLE public.projects RENAME COLUMN sitephotos TO "sitePhotos";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'dailyreports') THEN
    ALTER TABLE public.projects RENAME COLUMN dailyreports TO "dailyReports";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'preconstruction') THEN
    ALTER TABLE public.projects RENAME COLUMN preconstruction TO "preConstruction";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'preconstructiontasks') THEN
    ALTER TABLE public.projects RENAME COLUMN preconstructiontasks TO "preConstructionTasks";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'landparcels') THEN
    ALTER TABLE public.projects RENAME COLUMN landparcels TO "landParcels";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'mapoverlays') THEN
    ALTER TABLE public.projects RENAME COLUMN mapoverlays TO "mapOverlays";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'kmldata') THEN
    ALTER TABLE public.projects RENAME COLUMN kmldata TO "kmlData";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'contractbills') THEN
    ALTER TABLE public.projects RENAME COLUMN contractbills TO "contractBills";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'subcontractorbills') THEN
    ALTER TABLE public.projects RENAME COLUMN subcontractorbills TO "subcontractorBills";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'measurementsheets') THEN
    ALTER TABLE public.projects RENAME COLUMN measurementsheets TO "measurementSheets";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'stafflocations') THEN
    ALTER TABLE public.projects RENAME COLUMN stafflocations TO "staffLocations";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'environmentregistry') THEN
    ALTER TABLE public.projects RENAME COLUMN environmentregistry TO "environmentRegistry";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'resourceallocations') THEN
    ALTER TABLE public.projects RENAME COLUMN resourceallocations TO "resourceAllocations";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'complianceworkflows') THEN
    ALTER TABLE public.projects RENAME COLUMN complianceworkflows TO "complianceWorkflows";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'lastsynced') THEN
    ALTER TABLE public.projects RENAME COLUMN lastsynced TO "lastSynced";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'spreadsheetid') THEN
    ALTER TABLE public.projects RENAME COLUMN spreadsheetid TO "spreadsheetId";
  END IF;
END $$;

COMMIT;
