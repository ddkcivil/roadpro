// Lightweight shim for sqliteService used during builds and tests.
// Provides a minimal API backed by localStorage so the app can run in browser
// environments where sql.js/SQLite isn't available.

// Enhanced shim: attempt to use sql.js if available at runtime (initSqlJs or SQL global),
// otherwise fall back to localStorage-backed shim.

declare global {
  interface Window { initSqlJs?: any; SQL?: any; }
}

let _db: any = null;
let _SQL: any = null;
let _useSqlJs = false;

export const sqliteService = {
  async initialize(): Promise<void> {
    console.log('[sqliteService] Initializing...');
    // Try to initialize sql.js if available in the global scope (e.g., loaded from /sql.js/sql-wasm.js)
    try {
      if ((window as any).initSqlJs && !_useSqlJs) {
        console.log('[sqliteService] Found initSqlJs, loading WASM...');
        _SQL = await (window as any).initSqlJs({ 
          locateFile: (file: string) => `/sql.js/${file}` 
        });
        console.log('[sqliteService] sql.js loaded, creating database...');
        _db = new _SQL.Database();
        _useSqlJs = true;
      } else if ((window as any).SQL && !_useSqlJs) {
        console.log('[sqliteService] Found SQL global...');
        _SQL = (window as any).SQL;
        _db = new _SQL.Database();
        _useSqlJs = true;
      } else {
        console.warn('[sqliteService] sql.js not found in window, using fallback.');
      }

      if (_useSqlJs && _db) {
        console.log('[sqliteService] Creating schema...');
        // Create schema
        _db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            phone TEXT,
            role TEXT,
            avatar TEXT
          );
          -- ... other tables ...
        `);
        console.log('[sqliteService] Schema created.');
        return;
      }
    } catch (err) {
      console.error('[sqliteService] CRITICAL INIT ERROR:', err);
    }

    console.log('[sqliteService] Initializing localStorage fallback...');
    // Ensure storage keys exist for shim behavior
    if (!localStorage.getItem('roadmaster-users')) localStorage.setItem('roadmaster-users', JSON.stringify([]));
    if (!localStorage.getItem('roadmaster-projects')) localStorage.setItem('roadmaster-projects', JSON.stringify([]));
    if (!localStorage.getItem('roadmaster-messages')) localStorage.setItem('roadmaster-messages', JSON.stringify([]));
    if (!localStorage.getItem('roadmaster-settings')) localStorage.setItem('roadmaster-settings', JSON.stringify({}));
    console.log('[sqliteService] Fallback initialized.');
  },

  isAvailable(): boolean {
    return _useSqlJs;
  },

  async getAllUsers(): Promise<any[]> {
    if (_useSqlJs && _db) {
      try {
        const res = _db.exec('SELECT * FROM users;');
        if (!res || res.length === 0) return [];
        const values = res[0];
        return values.values.map((row: any[]) => {
          const obj: any = {};
          values.columns.forEach((col: string, i: number) => obj[col] = row[i]);
          return obj;
        });
      } catch (err) {
        console.warn('sqliteService.getAllUsers query failed', err);
        return [];
      }
    }
    const raw = localStorage.getItem('roadmaster-users');
    return raw ? JSON.parse(raw) : [];
  },

  async getAllProjects(): Promise<any[]> {
    if (_useSqlJs && _db) {
      try {
        const res = _db.exec('SELECT * FROM projects;');
        if (!res || res.length === 0) return [];
        const values = res[0];
        return values.values.map((row: any[]) => {
          const obj: any = {};
          values.columns.forEach((col: string, i: number) => obj[col] = row[i]);
          return obj;
        });
      } catch (err) {
        console.warn('sqliteService.getAllProjects query failed', err);
        return [];
      }
    }
    const raw = localStorage.getItem('roadmaster-projects');
    return raw ? JSON.parse(raw) : [];
  },

  async getAllMessages(): Promise<any[]> {
    if (_useSqlJs && _db) {
      try {
        const res = _db.exec('SELECT * FROM messages;');
        if (!res || res.length === 0) return [];
        const values = res[0];
        return values.values.map((row: any[]) => {
          const obj: any = {};
          values.columns.forEach((col: string, i: number) => obj[col] = row[i]);
          return obj;
        });
      } catch (err) {
        console.warn('sqliteService.getAllMessages query failed', err);
        return [];
      }
    }
    const raw = localStorage.getItem('roadmaster-messages');
    return raw ? JSON.parse(raw) : [];
  },

  async insert(table: string, record: any): Promise<void> {
    if (_useSqlJs && _db) {
      try {
        // Build a simple insert statement (assumes record keys match columns)
        const cols = Object.keys(record).map(c => `\"${c}\"`).join(',');
        const placeholders = Object.keys(record).map(_ => '?').join(',');
        const stmt = _db.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders});`);
        stmt.run(Object.values(record));
        stmt.free();
        return;
      } catch (err) {
        console.warn('sqliteService.insert via sql.js failed, falling back to shim', err);
      }
    }

    try {
      const key = table === 'settings' ? 'roadmaster-settings' : table === 'users' ? 'roadmaster-users' : table === 'projects' ? 'roadmaster-projects' : table === 'messages' ? 'roadmaster-messages' : null;
      if (!key) return;
      const raw = localStorage.getItem(key) || '[]';
      const arr = key === 'roadmaster-settings' ? JSON.parse(raw || '{}') : JSON.parse(raw);
      if (key === 'roadmaster-settings') {
        const obj = arr || {};
        obj[record.key] = record.value;
        localStorage.setItem(key, JSON.stringify(obj));
      } else {
        arr.push(record);
        localStorage.setItem(key, JSON.stringify(arr));
      }
    } catch (err) {
      console.warn('sqliteService.insert shim error', err);
    }
  },

  async select(table: string, cols: string[] = [], where?: string, params?: any[]): Promise<any[]> {
    if (_useSqlJs && _db) {
      try {
        const q = `SELECT ${cols.length ? cols.join(',') : '*'} FROM ${table} ${where ? 'WHERE ' + where : ''};`;
        const res = _db.exec(q, params || []);
        if (!res || res.length === 0) return [];
        const values = res[0];
        return values.values.map((row: any[]) => {
          const obj: any = {};
          values.columns.forEach((col: string, i: number) => obj[col] = row[i]);
          return obj;
        });
      } catch (err) {
        console.warn('sqliteService.select via sql.js failed', err);
        return [];
      }
    }

    if (table === 'settings') {
      const raw = localStorage.getItem('roadmaster-settings') || '{}';
      const obj = JSON.parse(raw);
      if (where && params && params.length > 0) {
        const key = params[0];
        const value = obj[key];
        return value ? [{ key, value }] : [];
      }
      return Object.keys(obj).map(k => ({ key: k, value: obj[k] }));
    }
    if (table === 'users') return this.getAllUsers();
    if (table === 'projects') return this.getAllProjects();
    if (table === 'messages') return this.getAllMessages();
    return [];
  },

  async executeQuery(query: string): Promise<any[]> {
    if (_useSqlJs && _db) {
      try {
        const res = _db.exec(query);
        if (!res || res.length === 0) return [];
        // Concatenate results from multiple statements
        const rows: any[] = [];
        for (const block of res) {
          const cols = block.columns;
          for (const row of block.values) {
            const obj: any = {};
            cols.forEach((c: string, i: number) => obj[c] = row[i]);
            rows.push(obj);
          }
        }
        return rows;
      } catch (err) {
        console.warn('sqliteService.executeQuery failed', err);
        return [];
      }
    }
    console.warn('sqliteService.executeQuery: shim does not execute SQL. Query:', query);
    return [];
  },

  async getProjectStats(_projectId: string): Promise<any> {
    if (_useSqlJs && _db) {
      try {
        const res = await this.executeQuery(`SELECT (SELECT COUNT(*) FROM boq_items WHERE project_id = '${_projectId}') as boq_items_count, (SELECT COUNT(*) FROM rfis WHERE project_id = '${_projectId}') as rfis_count, (SELECT COUNT(*) FROM lab_tests WHERE project_id = '${_projectId}') as lab_tests_count, (SELECT AVG(progress) FROM schedule_tasks WHERE project_id = '${_projectId}') as avg_schedule_progress, (SELECT COUNT(*) FROM daily_reports WHERE project_id = '${_projectId}') as daily_reports_count;`);
        return res[0] || { boq_items_count: 0, rfis_count: 0, lab_tests_count: 0, avg_schedule_progress: 0, daily_reports_count: 0 };
      } catch (err) {
        console.warn('getProjectStats via sql.js failed', err);
      }
    }
    return { boq_items_count: 0, rfis_count: 0, lab_tests_count: 0, avg_schedule_progress: 0, daily_reports_count: 0 };
  }
};

export default sqliteService;
