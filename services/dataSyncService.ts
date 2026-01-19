import { Project, User, Message } from '../types';
import { sqliteService } from './sqliteService';

export class DataSyncService {
  // Sync users from localStorage to SQLite
  static async syncUsersToSQLite(): Promise<void> {
    try {
      const usersJson = localStorage.getItem('roadmaster-users');
      if (usersJson) {
        const users: User[] = JSON.parse(usersJson);
        for (const user of users) {
          await sqliteService.insert('users', {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar
          });
        }
      }
    } catch (error) {
      console.error('Error syncing users to SQLite:', error);
    }
  }

  // Sync projects from localStorage to SQLite
  static async syncProjectsToSQLite(): Promise<void> {
    try {
      const projectsJson = localStorage.getItem('roadmaster-projects');
      if (projectsJson) {
        const projects: Project[] = JSON.parse(projectsJson);
        for (const project of projects) {
          await sqliteService.insert('projects', {
            id: project.id,
            name: project.name,
            code: project.code,
            location: project.location,
            contractor: project.contractor,
            start_date: project.startDate,
            end_date: project.endDate,
            client: project.client,
            engineer: project.engineer,
            contract_no: project.contractNo,
            boq: JSON.stringify(project.boq),
            rfis: JSON.stringify(project.rfis),
            lab_tests: JSON.stringify(project.labTests),
            schedule: JSON.stringify(project.schedule),
            structures: JSON.stringify(project.structures || []),
            agencies: JSON.stringify(project.agencies || []),
            agency_payments: JSON.stringify(project.agencyPayments || []),
            linear_works: JSON.stringify(project.linearWorks || []),
            inventory: JSON.stringify(project.inventory),
            inventory_transactions: JSON.stringify(project.inventoryTransactions),
            vehicles: JSON.stringify(project.vehicles),
            vehicle_logs: JSON.stringify(project.vehicleLogs),
            documents: JSON.stringify(project.documents),
            site_photos: JSON.stringify(project.sitePhotos || []),
            daily_reports: JSON.stringify(project.dailyReports),
            pre_construction: JSON.stringify(project.preConstruction || []),
            land_parcels: JSON.stringify(project.landParcels),
            map_overlays: JSON.stringify(project.mapOverlays),
            hindrances: JSON.stringify(project.hindrances),
            nc_rs: JSON.stringify(project.ncrs),
            contract_bills: JSON.stringify(project.contractBills),
            subcontractor_bills: JSON.stringify(project.subcontractorBills || []),
            measurement_sheets: JSON.stringify(project.measurementSheets),
            staff_locations: JSON.stringify(project.staffLocations),
            environment_registry: JSON.stringify(project.environmentRegistry || {}),
            last_synced: project.lastSynced,
            spreadsheet_id: project.spreadsheetId,
            settings: JSON.stringify(project.settings || {})
          });
        }
      }
    } catch (error) {
      console.error('Error syncing projects to SQLite:', error);
    }
  }

  // Sync messages from localStorage to SQLite
  static async syncMessagesToSQLite(): Promise<void> {
    try {
      const messagesJson = localStorage.getItem('roadmaster-messages');
      if (messagesJson) {
        const messages: Message[] = JSON.parse(messagesJson);
        for (const message of messages) {
          await sqliteService.insert('messages', {
            id: message.id,
            sender_id: message.senderId,
            receiver_id: message.receiverId,
            content: message.content,
            timestamp: message.timestamp,
            read_status: message.read ? 1 : 0,
            project_id: message.projectId
          });
        }
      }
    } catch (error) {
      console.error('Error syncing messages to SQLite:', error);
    }
  }

  // Sync settings from localStorage to SQLite
  static async syncSettingsToSQLite(): Promise<void> {
    try {
      const settingsJson = localStorage.getItem('roadmaster-settings');
      if (settingsJson) {
        await sqliteService.insert('settings', {
          key: 'app_settings',
          value: settingsJson
        });
      }
    } catch (error) {
      console.error('Error syncing settings to SQLite:', error);
    }
  }

  // Sync all data from localStorage to SQLite
  static async syncAllToSQLite(): Promise<void> {
    await this.syncUsersToSQLite();
    await this.syncProjectsToSQLite();
    await this.syncMessagesToSQLite();
    await this.syncSettingsToSQLite();
  }

  // Sync users from SQLite to localStorage
  static async syncUsersFromSQLite(): Promise<void> {
    try {
      const users = await sqliteService.getAllUsers();
      const userObjects = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar
      }));
      localStorage.setItem('roadmaster-users', JSON.stringify(userObjects));
    } catch (error) {
      console.error('Error syncing users from SQLite:', error);
    }
  }

  // Sync projects from SQLite to localStorage
  static async syncProjectsFromSQLite(): Promise<void> {
    try {
      const projects = await sqliteService.getAllProjects();
      const projectObjects = projects.map(project => ({
        id: project.id,
        name: project.name,
        code: project.code,
        location: project.location,
        contractor: project.contractor,
        startDate: project.start_date,
        endDate: project.end_date,
        client: project.client,
        engineer: project.engineer,
        contractNo: project.contract_no,
        boq: JSON.parse(project.boq || '[]'),
        rfis: JSON.parse(project.rfis || '[]'),
        labTests: JSON.parse(project.lab_tests || '[]'),
        schedule: JSON.parse(project.schedule || '[]'),
        structures: JSON.parse(project.structures || '[]'),
        agencies: JSON.parse(project.agencies || '[]'),
        agencyPayments: JSON.parse(project.agency_payments || '[]'),
        linearWorks: JSON.parse(project.linear_works || '[]'),
        inventory: JSON.parse(project.inventory || '[]'),
        inventoryTransactions: JSON.parse(project.inventory_transactions || '[]'),
        vehicles: JSON.parse(project.vehicles || '[]'),
        vehicleLogs: JSON.parse(project.vehicle_logs || '[]'),
        documents: JSON.parse(project.documents || '[]'),
        sitePhotos: JSON.parse(project.site_photos || '[]'),
        dailyReports: JSON.parse(project.daily_reports || '[]'),
        preConstruction: JSON.parse(project.pre_construction || '[]'),
        landParcels: JSON.parse(project.land_parcels || '[]'),
        mapOverlays: JSON.parse(project.map_overlays || '[]'),
        hindrances: JSON.parse(project.hindrances || '[]'),
        ncrs: JSON.parse(project.nc_rs || '[]'),
        contractBills: JSON.parse(project.contract_bills || '[]'),
        subcontractorBills: JSON.parse(project.subcontractor_bills || '[]'),
        measurementSheets: JSON.parse(project.measurement_sheets || '[]'),
        staffLocations: JSON.parse(project.staff_locations || '[]'),
        environmentRegistry: JSON.parse(project.environment_registry || '{}'),
        lastSynced: project.last_synced,
        spreadsheetId: project.spreadsheet_id,
        settings: JSON.parse(project.settings || '{}')
      }));
      localStorage.setItem('roadmaster-projects', JSON.stringify(projectObjects));
    } catch (error) {
      console.error('Error syncing projects from SQLite:', error);
    }
  }

  // Sync messages from SQLite to localStorage
  static async syncMessagesFromSQLite(): Promise<void> {
    try {
      const messages = await sqliteService.getAllMessages();
      const messageObjects = messages.map(message => ({
        id: message.id,
        senderId: message.sender_id,
        receiverId: message.receiver_id,
        content: message.content,
        timestamp: message.timestamp,
        read: Boolean(message.read_status),
        projectId: message.project_id
      }));
      localStorage.setItem('roadmaster-messages', JSON.stringify(messageObjects));
    } catch (error) {
      console.error('Error syncing messages from SQLite:', error);
    }
  }

  // Sync settings from SQLite to localStorage
  static async syncSettingsFromSQLite(): Promise<void> {
    try {
      const settings = await sqliteService.select('settings', [], 'key = ?', ['app_settings']);
      if (settings.length > 0) {
        localStorage.setItem('roadmaster-settings', settings[0].value);
      }
    } catch (error) {
      console.error('Error syncing settings from SQLite:', error);
    }
  }

  // Sync all data from SQLite to localStorage
  static async syncAllFromSQLite(): Promise<void> {
    await this.syncUsersFromSQLite();
    await this.syncProjectsFromSQLite();
    await this.syncMessagesFromSQLite();
    await this.syncSettingsFromSQLite();
  }

  // Get projects with analytics
  static async getProjectsWithAnalytics(): Promise<any[]> {
    try {
      const projects = await sqliteService.getAllProjects();
      const projectsWithStats = [];

      for (const project of projects) {
        const stats = await sqliteService.getProjectStats(project.id);
        projectsWithStats.push({
          ...project,
          analytics: stats
        });
      }

      return projectsWithStats;
    } catch (error) {
      console.error('Error getting projects with analytics:', error);
      // Fallback to localStorage if SQLite fails
      const projectsJson = localStorage.getItem('roadmaster-projects');
      return projectsJson ? JSON.parse(projectsJson) : [];
    }
  }

  // Get user reports
  static async getUserReports(): Promise<any[]> {
    try {
      return await sqliteService.executeQuery(`
        SELECT 
          u.id,
          u.name,
          u.role,
          u.email,
          COUNT(m.id) as message_count,
          COUNT(p.id) as projects_assigned
        FROM users u
        LEFT JOIN messages m ON m.sender_id = u.id
        LEFT JOIN projects p ON p.id IN (
          SELECT project_id FROM messages WHERE sender_id = u.id
          UNION
          SELECT id FROM projects WHERE JSON_EXTRACT(schedule, '$[*].assignedTo') LIKE '%' || u.id || '%'
        )
        GROUP BY u.id, u.name, u.role, u.email
      `);
    } catch (error) {
      console.error('Error getting user reports:', error);
      return [];
    }
  }

  // Get project reports
  static async getProjectReports(): Promise<any[]> {
    try {
      return await sqliteService.executeQuery(`
        SELECT 
          p.id,
          p.name,
          p.code,
          p.location,
          p.start_date,
          p.end_date,
          p.contractor,
          (SELECT COUNT(*) FROM boq_items WHERE project_id = p.id) as boq_items_count,
          (SELECT COUNT(*) FROM rfis WHERE project_id = p.id) as rfis_count,
          (SELECT COUNT(*) FROM lab_tests WHERE project_id = p.id) as lab_tests_count,
          (SELECT AVG(progress) FROM schedule_tasks WHERE project_id = p.id) as avg_schedule_progress,
          (SELECT COUNT(*) FROM daily_reports WHERE project_id = p.id) as daily_reports_count
        FROM projects p
      `);
    } catch (error) {
      console.error('Error getting project reports:', error);
      return [];
    }
  }
}