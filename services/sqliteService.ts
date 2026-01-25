// Dynamically import sql.js to avoid bundling issues
let initSqlJs: any;
let Database: any;

class SQLiteService {
  private db: any | null = null;
  private SQL: any | null = null;
  private initializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    // If already initialized, return
    if (this.db) return;
    
    // If initialization is in progress, wait for it
    if (this.initializing && this.initPromise) {
      return this.initPromise;
    }
    
    // Mark as initializing
    this.initializing = true;
    
    // Store the promise to handle concurrent calls
    this.initPromise = this.performInitialization();
    
    try {
      await this.initPromise;
    } finally {
      this.initializing = false;
    }
  }

  private async performInitialization(): Promise<void> {
    try {
      // Dynamically import sql.js only when needed
      if (!initSqlJs) {
        const sqlModule = await import('sql.js');
        initSqlJs = sqlModule.default || sqlModule;
      }
      // Initialize SQL.js with proper WASM loading
      // First try CDN, then fallback to direct CDN URL
      try {
        this.SQL = await initSqlJs({
          locateFile: file => {
            // Use a CDN that serves the files properly
            if (file.endsWith('.wasm')) {
              return 'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/' + file;
            }
            return `https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/${file}`;
          }
        });
      } catch (cdnError) {
        console.warn('CDN loading failed, trying direct initialization:', cdnError);
        // Fallback to direct initialization without CDN
        this.SQL = await initSqlJs();
      }
      
      // Initialize database - either load existing from localStorage or create new
      const existingData = localStorage.getItem('roadmaster-sqlite-db');
      if (existingData) {
        const binaryData = atob(existingData);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        this.db = new this.SQL.Database(bytes);
      } else {
        this.db = new this.SQL.Database();
        this.createTables();
      }
    } catch (error) {
      console.error('Failed to initialize SQLite service:', error);
      // Fallback to creating an in-memory database
      try {
        if (this.SQL) {
          this.db = new this.SQL.Database();
          this.createTables();
        } else {
          // If SQL couldn't be initialized at all, create a mock implementation
          console.warn('SQLite not available, falling back to mock implementation');
          // Set db to null to indicate that SQLite is not available
          this.db = null;
        }
      } catch (fallbackError) {
        console.error('Fallback initialization also failed:', fallbackError);
        this.db = null;
      }
    }
  }

  private createTables(): void {
    if (!this.db) return;

    // Create tables for all the main entities
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        role TEXT,
        avatar TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT,
        location TEXT,
        contractor TEXT,
        start_date TEXT,
        end_date TEXT,
        client TEXT,
        engineer TEXT,
        contract_no TEXT,
        boq TEXT,
        rfis TEXT,
        lab_tests TEXT,
        schedule TEXT,
        structures TEXT,
        agencies TEXT,
        agency_payments TEXT,
        linear_works TEXT,
        inventory TEXT,
        inventory_transactions TEXT,
        vehicles TEXT,
        vehicle_logs TEXT,
        documents TEXT,
        site_photos TEXT,
        daily_reports TEXT,
        pre_construction TEXT,
        land_parcels TEXT,
        map_overlays TEXT,
        hindrances TEXT,
        nc_rs TEXT,
        contract_bills TEXT,
        subcontractor_bills TEXT,
        measurement_sheets TEXT,
        staff_locations TEXT,
        environment_registry TEXT,
        last_synced TEXT,
        spreadsheet_id TEXT,
        settings TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT,
        receiver_id TEXT,
        content TEXT NOT NULL,
        timestamp TEXT,
        read_status INTEGER DEFAULT 0,
        project_id TEXT
      )
    `);

    // Create settings table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);

    // Create BOQ items table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS boq_items (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        item_no TEXT,
        description TEXT,
        unit TEXT,
        quantity REAL,
        rate REAL,
        amount REAL,
        category TEXT,
        status TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);

    // Create RFIs table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS rfis (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT,
        description TEXT,
        raised_by TEXT,
        assigned_to TEXT,
        status TEXT,
        priority TEXT,
        created_at TEXT,
        updated_at TEXT,
        resolved_at TEXT
      )
    `);

    // Create lab tests table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS lab_tests (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        test_type TEXT,
        sample_id TEXT,
        date_performed TEXT,
        results TEXT,
        status TEXT,
        technician TEXT,
        created_at TEXT
      )
    `);

    // Create schedule tasks table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS schedule_tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        task_name TEXT,
        start_date TEXT,
        end_date TEXT,
        duration INTEGER,
        progress REAL,
        assigned_to TEXT,
        status TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);

    // Create daily reports table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS daily_reports (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        date TEXT,
        weather TEXT,
        work_done TEXT,
        materials_used TEXT,
        workforce TEXT,
        equipment TEXT,
        issues TEXT,
        next_day_plan TEXT,
        prepared_by TEXT,
        approved_by TEXT,
        created_at TEXT
      )
    `);
  }

  async migrateFromLocalStorage(): Promise<void> {
    if (!this.db) {
      await this.initialize();
      // If db is still null after initialization, SQLite is not available
      if (!this.db) {
        console.warn('SQLite not available, skipping migration');
        return;
      }
    }

    // Get data from localStorage
    const usersJson = localStorage.getItem('roadmaster-users');
    const projectsJson = localStorage.getItem('roadmaster-projects');
    const messagesJson = localStorage.getItem('roadmaster-messages');

    // Insert users
    if (usersJson) {
      const users = JSON.parse(usersJson);
      for (const user of users) {
        try {
          this.db!.run(
            `INSERT OR REPLACE INTO users (id, name, email, phone, role, avatar) VALUES (?, ?, ?, ?, ?, ?)`,
            [user.id, user.name, user.email, user.phone, user.role, user.avatar]
          );
        } catch (e) {
          console.warn('Error inserting user:', e);
        }
      }
    }

    // Insert projects
    if (projectsJson) {
      const projects = JSON.parse(projectsJson);
      for (const project of projects) {
        try {
          // Convert undefined values to null for SQLite binding
          const cleanProject = {
            id: project.id,
            name: project.name || '',
            code: project.code || null,
            location: project.location || '',
            contractor: project.contractor || '',
            start_date: project.start_date || null,
            end_date: project.end_date || null,
            client: project.client || '',
            engineer: project.engineer || null,
            contract_no: project.contract_no || null,
            boq: JSON.stringify(project.boq || []),
            rfis: JSON.stringify(project.rfis || []),
            lab_tests: JSON.stringify(project.lab_tests || []),
            schedule: JSON.stringify(project.schedule || []),
            structures: JSON.stringify(project.structures || []),
            agencies: JSON.stringify(project.agencies || []),
            agency_payments: JSON.stringify(project.agency_payments || []),
            linear_works: JSON.stringify(project.linear_works || []),
            inventory: JSON.stringify(project.inventory || []),
            inventory_transactions: JSON.stringify(project.inventory_transactions || []),
            vehicles: JSON.stringify(project.vehicles || []),
            vehicle_logs: JSON.stringify(project.vehicle_logs || []),
            documents: JSON.stringify(project.documents || []),
            site_photos: JSON.stringify(project.site_photos || []),
            daily_reports: JSON.stringify(project.daily_reports || []),
            pre_construction: JSON.stringify(project.pre_construction || []),
            land_parcels: JSON.stringify(project.land_parcels || []),
            map_overlays: JSON.stringify(project.map_overlays || []),
            hindrances: JSON.stringify(project.hindrances || []),
            nc_rs: JSON.stringify(project.nc_rs || []),
            contract_bills: JSON.stringify(project.contract_bills || []),
            subcontractor_bills: JSON.stringify(project.subcontractor_bills || []),
            measurement_sheets: JSON.stringify(project.measurement_sheets || []),
            staff_locations: JSON.stringify(project.staff_locations || []),
            environment_registry: JSON.stringify(project.environment_registry || []),
            last_synced: project.last_synced || null,
            spreadsheet_id: project.spreadsheet_id || null,
            settings: JSON.stringify(project.settings || {})
          };

          this.db!.run(
            `INSERT OR REPLACE INTO projects 
            (id, name, code, location, contractor, start_date, end_date, client, engineer, contract_no, 
             boq, rfis, lab_tests, schedule, structures, agencies, agency_payments, linear_works, 
             inventory, inventory_transactions, vehicles, vehicle_logs, documents, site_photos, 
             daily_reports, pre_construction, land_parcels, map_overlays, hindrances, nc_rs, 
             contract_bills, subcontractor_bills, measurement_sheets, staff_locations, 
             environment_registry, last_synced, spreadsheet_id, settings) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cleanProject.id, cleanProject.name, cleanProject.code, cleanProject.location, cleanProject.contractor,
              cleanProject.start_date, cleanProject.end_date, cleanProject.client, cleanProject.engineer, cleanProject.contract_no,
              cleanProject.boq, cleanProject.rfis, cleanProject.lab_tests, cleanProject.schedule,
              cleanProject.structures, cleanProject.agencies, cleanProject.agency_payments, cleanProject.linear_works,
              cleanProject.inventory, cleanProject.inventory_transactions, cleanProject.vehicles, cleanProject.vehicle_logs,
              cleanProject.documents, cleanProject.site_photos, cleanProject.daily_reports, cleanProject.pre_construction,
              cleanProject.land_parcels, cleanProject.map_overlays, cleanProject.hindrances, cleanProject.nc_rs,
              cleanProject.contract_bills, cleanProject.subcontractor_bills, cleanProject.measurement_sheets, cleanProject.staff_locations,
              cleanProject.environment_registry, cleanProject.last_synced, cleanProject.spreadsheet_id, cleanProject.settings
            ]
          );
        } catch (e) {
          console.warn('Error inserting project:', e);
        }
      }
    }

    // Insert messages
    if (messagesJson) {
      const messages = JSON.parse(messagesJson);
      for (const message of messages) {
        try {
          this.db!.run(
            `INSERT OR REPLACE INTO messages (id, sender_id, receiver_id, content, timestamp, read_status, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [message.id, message.sender_id, message.receiver_id, message.content, message.timestamp, message.read_status || 0, message.project_id]
          );
        } catch (e) {
          console.warn('Error inserting message:', e);
        }
      }
    }

    // Save the database to localStorage
    this.saveToLocalStorage();
  }

  private saveTimeout: NodeJS.Timeout | null = null;
  private isSaving: boolean = false;
  
  private saveToLocalStorage(): void {
    if (this.isSaving) {
      console.log('Already saving, skipping...');
      return;
    }
    
    if (this.db && this.SQL) {
      try {
        this.isSaving = true;
        const data = this.db.export();
        const encoded = btoa(String.fromCharCode(...data));
        localStorage.setItem('roadmaster-sqlite-db', encoded);
      } catch (error) {
        console.error('Error saving SQLite database to localStorage:', error);
      } finally {
        this.isSaving = false;
      }
    }
  }
  
  // Debounced save method to prevent excessive saves
  private scheduleSave(): void {
    // Temporarily disable automatic saving to prevent stack overflow
    console.log('Automatic saving temporarily disabled to prevent stack overflow');
    return;
    
    /*
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveToLocalStorage();
      this.saveTimeout = null;
    }, 1000); // Save after 1 second of inactivity
    */
  }

  async executeQuery(query: string, params: any[] = []): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
      if (!this.db) {
        throw new Error('SQLite database not available');
      }
    }

    try {
      const stmt = this.db.prepare(query);
      const result = [];
      
      while (stmt.step()) {
        result.push(stmt.getAsObject());
      }
      
      stmt.free();
      this.scheduleSave(); // Use debounced save instead of immediate save
      return result;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  async insert(table: string, data: Record<string, any>): Promise<void> {
    if (!this.db) {
      await this.initialize();
      if (!this.db) {
        throw new Error('SQLite database not available');
      }
    }

    // Convert undefined values to null to prevent binding errors
    const cleanData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value])
    );

    const columns = Object.keys(cleanData).join(', ');
    const placeholders = Object.keys(cleanData).map(() => '?').join(', ');
    const values = Object.values(cleanData);

    try {
      this.db.run(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values);
      this.scheduleSave(); // Use debounced save instead of immediate save
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error);
      throw error;
    }
  }

  async update(table: string, data: Record<string, any>, whereClause: string, whereParams: any[] = []): Promise<void> {
    if (!this.db) {
      await this.initialize();
      if (!this.db) {
        throw new Error('SQLite database not available');
      }
    }

    // Convert undefined values to null to prevent binding errors
    const cleanData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value])
    );

    const setClause = Object.keys(cleanData).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(cleanData), ...whereParams];

    try {
      this.db.run(`UPDATE ${table} SET ${setClause} WHERE ${whereClause}`, values);
      this.scheduleSave(); // Use debounced save instead of immediate save
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      throw error;
    }
  }

  async delete(table: string, whereClause: string, whereParams: any[] = []): Promise<void> {
    if (!this.db) {
      await this.initialize();
      if (!this.db) {
        throw new Error('SQLite database not available');
      }
    }

    try {
      this.db.run(`DELETE FROM ${table} WHERE ${whereClause}`, whereParams);
      this.scheduleSave(); // Use debounced save instead of immediate save
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      throw error;
    }
  }

  async select(table: string, columns: string[] = ['*'], whereClause?: string, whereParams: any[] = []): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
      if (!this.db) {
        throw new Error('SQLite database not available');
      }
    }

    const columnStr = columns.join(', ');
    const query = whereClause 
      ? `SELECT ${columnStr} FROM ${table} WHERE ${whereClause}`
      : `SELECT ${columnStr} FROM ${table}`;

    try {
      const stmt = this.db.prepare(query);
      const result = [];
      
      // Bind parameters if provided
      if (whereParams.length > 0) {
        stmt.bind(whereParams);
      }
      
      while (stmt.step()) {
        result.push(stmt.getAsObject());
      }
      
      stmt.free();
      return result;
    } catch (error) {
      console.error(`Error selecting from ${table}:`, error);
      throw error;
    }
  }

  async getAllUsers(): Promise<any[]> {
    return this.select('users');
  }

  async getAllProjects(): Promise<any[]> {
    return this.select('projects');
  }

  async getAllMessages(): Promise<any[]> {
    return this.select('messages');
  }

  async getAllBoqItems(): Promise<any[]> {
    return this.select('boq_items');
  }

  async getAllRfis(): Promise<any[]> {
    return this.select('rfis');
  }

  async getAllLabTests(): Promise<any[]> {
    return this.select('lab_tests');
  }

  async getAllScheduleTasks(): Promise<any[]> {
    return this.select('schedule_tasks');
  }

  async getAllDailyReports(): Promise<any[]> {
    return this.select('daily_reports');
  }

  async getProjectStats(projectId?: string): Promise<{total: number, active: number, completed: number, avg_progress?: number}> {
    if (!this.db) {
      await this.initialize();
      if (!this.db) {
        return { total: 0, active: 0, completed: 0 };
      }
    }

    try {
      let baseQuery = "SELECT COUNT(*) as count FROM projects";
      // Since there's no status column in the projects table, we'll count based on endDate comparison
      // For now, let's just count all projects as "active" or "completed" based on endDate
      let activeQuery = "SELECT COUNT(*) as count FROM projects WHERE end_date > date('now')";
      let completedQuery = "SELECT COUNT(*) as count FROM projects WHERE end_date <= date('now')";
      let avgProgressQuery = "SELECT AVG(progress) as avg_progress FROM schedule_tasks";
      
      if (projectId) {
        baseQuery += ` WHERE id = '${projectId}'`;
        activeQuery += ` AND id = '${projectId}'`;
        completedQuery += ` AND id = '${projectId}'`;
        avgProgressQuery += ` WHERE project_id = '${projectId}'`;
      }
      
      const totalResult = this.db.exec(baseQuery);
      const activeResult = this.db.exec(activeQuery);
      const completedResult = this.db.exec(completedQuery);
      const avgProgressResult = this.db.exec(avgProgressQuery);

      return {
        total: Number(totalResult[0]?.values[0][0]) || 0,
        active: Number(activeResult[0]?.values[0][0]) || 0,
        completed: Number(completedResult[0]?.values[0][0]) || 0,
        avg_progress: Number(avgProgressResult[0]?.values[0][0]) || 0
      };
    } catch (error) {
      console.error('Error getting project stats:', error);
      return { total: 0, active: 0, completed: 0 };
    }
  }

  // Method to check if SQLite is available
  isAvailable(): boolean {
    return this.db !== null;
  }
}

// Export singleton instance
export const sqliteService = new SQLiteService();