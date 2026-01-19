import initSqlJs, { Database } from 'sql.js';

class SQLiteService {
  private db: Database | null = null;
  private SQL: any | null = null;

  async initialize(): Promise<void> {
    if (this.db) return; // Already initialized

    try {
      this.SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });
      
      // Initialize database - either load existing from localStorage or create new
      const existingData = localStorage.getItem('roadmaster-sqlite-db');
      if (existingData) {
        const data = Uint8Array.from(atob(existingData), c => c.charCodeAt(0));
        this.db = new this.SQL.Database(data);
      } else {
        this.db = new this.SQL.Database();
        this.createTables();
      }
    } catch (error) {
      console.error('Failed to initialize SQLite service:', error);
      // Fallback to creating an in-memory database
      if (this.SQL) {
        this.db = new this.SQL.Database();
        this.createTables();
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
        boq TEXT, -- JSON string
        rfis TEXT, -- JSON string
        lab_tests TEXT, -- JSON string
        schedule TEXT, -- JSON string
        structures TEXT, -- JSON string
        agencies TEXT, -- JSON string
        agency_payments TEXT, -- JSON string
        linear_works TEXT, -- JSON string
        inventory TEXT, -- JSON string
        inventory_transactions TEXT, -- JSON string
        vehicles TEXT, -- JSON string
        vehicle_logs TEXT, -- JSON string
        documents TEXT, -- JSON string
        site_photos TEXT, -- JSON string
        daily_reports TEXT, -- JSON string
        pre_construction TEXT, -- JSON string
        land_parcels TEXT, -- JSON string
        map_overlays TEXT, -- JSON string
        hindrances TEXT, -- JSON string
        nc_rs TEXT, -- JSON string for NCRs
        contract_bills TEXT, -- JSON string
        subcontractor_bills TEXT, -- JSON string
        measurement_sheets TEXT, -- JSON string
        staff_locations TEXT, -- JSON string
        environment_registry TEXT, -- JSON string
        last_synced TEXT,
        spreadsheet_id TEXT,
        settings TEXT -- JSON string
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
        location TEXT,
        completed_quantity REAL,
        variation_quantity REAL,
        revised_quantity REAL,
        status TEXT,
        subcontractor_id TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS rfis (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        rfi_number TEXT,
        date TEXT,
        location TEXT,
        description TEXT,
        category TEXT,
        status TEXT,
        requested_by TEXT,
        inspection_date TEXT,
        inspection_time TEXT,
        linked_task_id TEXT,
        workflow_log TEXT, -- JSON string
        question TEXT,
        priority TEXT,
        response_date TEXT,
        inspection_purpose TEXT,
        inspection_report TEXT,
        engineer_comments TEXT,
        are_signature TEXT,
        iow_signature TEXT,
        me_slt_signature TEXT,
        re_signature TEXT,
        request_number TEXT,
        working_drawings TEXT, -- JSON string
        submitted_by TEXT,
        received_by TEXT,
        submitted_date TEXT,
        received_date TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS lab_tests (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        test_name TEXT,
        category TEXT,
        sample_id TEXT,
        date TEXT,
        location TEXT,
        result TEXT,
        asset_id TEXT,
        component_id TEXT,
        test_data TEXT, -- JSON string
        calculated_value TEXT,
        standard_limit TEXT,
        technician TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS schedule_tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        name TEXT,
        task_name TEXT,
        description TEXT,
        start_date TEXT,
        end_date TEXT,
        duration REAL,
        progress REAL,
        status TEXT,
        assigned_to TEXT, -- JSON string
        dependencies TEXT, -- JSON string
        is_critical INTEGER,
        boq_item_id TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS daily_reports (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        date TEXT,
        report_number TEXT,
        status TEXT,
        submitted_by TEXT,
        work_today TEXT -- JSON string
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
  }

  async migrateFromLocalStorage(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    // Get data from localStorage
    const usersJson = localStorage.getItem('roadmaster-users');
    const projectsJson = localStorage.getItem('roadmaster-projects');
    const messagesJson = localStorage.getItem('roadmaster-messages');
    const settingsJson = localStorage.getItem('roadmaster-settings');

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
              project.id, project.name, project.code, project.location, project.contractor,
              project.startDate, project.endDate, project.client, project.engineer, project.contractNo,
              JSON.stringify(project.boq), JSON.stringify(project.rfis), JSON.stringify(project.labTests),
              JSON.stringify(project.schedule), JSON.stringify(project.structures || []),
              JSON.stringify(project.agencies || []), JSON.stringify(project.agencyPayments || []),
              JSON.stringify(project.linearWorks || []), JSON.stringify(project.inventory),
              JSON.stringify(project.inventoryTransactions), JSON.stringify(project.vehicles),
              JSON.stringify(project.vehicleLogs), JSON.stringify(project.documents),
              JSON.stringify(project.sitePhotos || []), JSON.stringify(project.dailyReports),
              JSON.stringify(project.preConstruction || []), JSON.stringify(project.landParcels),
              JSON.stringify(project.mapOverlays), JSON.stringify(project.hindrances),
              JSON.stringify(project.ncrs), JSON.stringify(project.contractBills),
              JSON.stringify(project.subcontractorBills || []), JSON.stringify(project.measurementSheets),
              JSON.stringify(project.staffLocations), JSON.stringify(project.environmentRegistry || {}),
              project.lastSynced, project.spreadsheetId, JSON.stringify(project.settings || {})
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
            [message.id, message.senderId, message.receiverId, message.content, message.timestamp, message.read ? 1 : 0, message.projectId]
          );
        } catch (e) {
          console.warn('Error inserting message:', e);
        }
      }
    }

    // Insert settings
    if (settingsJson) {
      try {
        this.db!.run(
          `INSERT OR REPLACE INTO settings (key, value) VALUES ('app_settings', ?)`,
          [settingsJson]
        );
      } catch (e) {
        console.warn('Error inserting settings:', e);
      }
    }

    // Save database to localStorage
    this.saveToLocalStorage();
  }

  saveToLocalStorage(): void {
    if (this.db) {
      try {
        const data = this.db.export();
        const buffer = Buffer.from(data);
        const base64 = buffer.toString('base64');
        localStorage.setItem('roadmaster-sqlite-db', base64);
      } catch (error) {
        console.error('Failed to save database to localStorage:', error);
      }
    }
  }

  async executeQuery(query: string, params?: any[]): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const stmt = this.db!.prepare(query);
      const results: any[] = [];

      if (params) {
        stmt.bind(params);
      }

      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }

      stmt.free();

      return results;
    } catch (error) {
      console.error('SQL Query Error:', error);
      throw error;
    }
  }

  async insert(table: string, data: Record<string, any>): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const columns = Object.keys(data);
      const placeholders = columns.map(() => '?').join(', ');
      const query = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
      const values = columns.map(col => {
        // Convert objects to JSON strings
        const value = data[col];
        return typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
      });

      this.db!.run(query, values);
      this.saveToLocalStorage();
    } catch (error) {
      console.error('SQL Insert Error:', error);
      throw error;
    }
  }

  async update(table: string, data: Record<string, any>, whereClause: string, whereParams: any[]): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const columns = Object.keys(data);
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
      
      const values = [
        ...columns.map(col => {
          const value = data[col];
          return typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
        }),
        ...whereParams
      ];

      this.db!.run(query, values);
      this.saveToLocalStorage();
    } catch (error) {
      console.error('SQL Update Error:', error);
      throw error;
    }
  }

  async delete(table: string, whereClause: string, whereParams: any[]): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const query = `DELETE FROM ${table} WHERE ${whereClause}`;
      this.db!.run(query, whereParams);
      this.saveToLocalStorage();
    } catch (error) {
      console.error('SQL Delete Error:', error);
      throw error;
    }
  }

  async select(table: string, columns: string[] = [], whereClause: string = '', whereParams: any[] = []): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const cols = columns.length > 0 ? columns.join(', ') : '*';
      let query = `SELECT ${cols} FROM ${table}`;
      
      if (whereClause) {
        query += ` WHERE ${whereClause}`;
      }

      return this.executeQuery(query, whereParams);
    } catch (error) {
      console.error('SQL Select Error:', error);
      throw error;
    }
  }

  // Specific query methods for common operations
  async getAllProjects(): Promise<any[]> {
    return this.select('projects');
  }

  async getProjectById(id: string): Promise<any> {
    const results = await this.select('projects', [], 'id = ?', [id]);
    return results.length > 0 ? results[0] : null;
  }

  async getAllUsers(): Promise<any[]> {
    return this.select('users');
  }

  async getUserById(id: string): Promise<any> {
    const results = await this.select('users', [], 'id = ?', [id]);
    return results.length > 0 ? results[0] : null;
  }

  async getAllMessages(): Promise<any[]> {
    return this.select('messages');
  }

  async getMessagesByProject(projectId: string): Promise<any[]> {
    return this.select('messages', [], 'project_id = ?', [projectId]);
  }

  async getBoqItemsByProject(projectId: string): Promise<any[]> {
    return this.select('boq_items', [], 'project_id = ?', [projectId]);
  }

  async getRfisByProject(projectId: string): Promise<any[]> {
    return this.select('rfis', [], 'project_id = ?', [projectId]);
  }

  async getLabTestsByProject(projectId: string): Promise<any[]> {
    return this.select('lab_tests', [], 'project_id = ?', [projectId]);
  }

  async getScheduleTasksByProject(projectId: string): Promise<any[]> {
    return this.select('schedule_tasks', [], 'project_id = ?', [projectId]);
  }

  async getDailyReportsByProject(projectId: string): Promise<any[]> {
    return this.select('daily_reports', [], 'project_id = ?', [projectId]);
  }

  // Analytics methods
  async getProjectStats(projectId: string): Promise<any> {
    if (!this.db) {
      await this.initialize();
    }

    const results = await this.executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM boq_items WHERE project_id = ?) as boq_count,
        (SELECT COUNT(*) FROM rfis WHERE project_id = ? AND status = 'Open') as open_rfis,
        (SELECT COUNT(*) FROM rfis WHERE project_id = ? AND status = 'Approved') as approved_rfis,
        (SELECT COUNT(*) FROM lab_tests WHERE project_id = ? AND result = 'Pass') as passed_tests,
        (SELECT COUNT(*) FROM lab_tests WHERE project_id = ? AND result = 'Fail') as failed_tests,
        (SELECT AVG(progress) FROM schedule_tasks WHERE project_id = ?) as avg_progress
    `, [projectId, projectId, projectId, projectId, projectId, projectId]);

    return results[0] || {};
  }

  async getCompletedWorkByDateRange(projectId: string, startDate: string, endDate: string): Promise<any[]> {
    return this.executeQuery(`
      SELECT d.date, w.quantity, w.description
      FROM daily_reports d
      JOIN json_each(d.work_today) AS work_table
      JOIN json_extract(d.work_today, '$[' || json_each.value || ']') AS w
      WHERE d.project_id = ?
        AND d.date BETWEEN ? AND ?
    `, [projectId, startDate, endDate]);
  }
}

export const sqliteService = new SQLiteService();