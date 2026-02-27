import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { UserRole } from './types';
import { LocalStorageUtils } from './utils/data/localStorageUtils';
import { DataCache } from './utils/data/cacheUtils';
import { PermissionsService } from './services/auth/permissionsService';
import { sqliteService } from './services/database/sqliteService';

// Test component that initializes all app services including SQLite
const TestApp: React.FC = () => {
  const [initialized, setInitialized] = useState(false);
  const [sqliteReady, setSqliteReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log('Starting service initialization...');
        
        // Initialize localStorage
        LocalStorageUtils.initializeEmptyData();
        console.log('✓ LocalStorage initialized');
        
        // Test permissions service
        const testUser = {
          id: 'test-001',
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          role: UserRole.PROJECT_MANAGER
        };
        
        const userWithPermissions = PermissionsService.createUserWithPermissions(testUser);
        console.log('✓ Permissions service working:', userWithPermissions);
        
        // Test cache
        DataCache.set('test-key', 'test-value', { ttl: 60000 });
        const cachedValue = DataCache.get('test-key');
        console.log('✓ Cache working:', cachedValue);
        
        // Test SQLite service
        console.log('Initializing SQLite service...');
        await sqliteService.initialize();
        console.log('✓ SQLite service initialized');
        
        // Test basic SQLite operations
        const testProjects = await sqliteService.getAllProjects();
        console.log('✓ SQLite projects query working:', testProjects.length, 'projects found');
        
        setSqliteReady(true);
        setInitialized(true);
        console.log('All services initialized successfully!');
        
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };
    
    initializeServices();
  }, []);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-red-50 font-sans">
        <div className="text-center p-5 bg-white rounded-lg shadow-lg border border-red-200 max-w-[500px]">
          <h1 className="text-red-700 mb-2.5 text-2xl font-bold">Initialization Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="text-left bg-gray-50 p-2.5 rounded text-xs font-mono">
            <p><strong>Debug Info:</strong></p>
            <p>LocalStorage: {LocalStorageUtils.getProjects() ? '✓' : '✗'}</p>
            <p>SQLite Ready: {sqliteReady ? '✓' : '✗'}</p>
            <p>Cache Size: {DataCache.size()}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white border-none rounded cursor-pointer hover:bg-indigo-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application services...</p>
          <div className="mt-2.5 text-xs text-gray-400">
            {sqliteReady ? '✓ SQLite ready' : '○ Initializing SQLite...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 font-sans">
      <div className="text-center p-5 bg-white rounded-lg shadow-lg">
        <h1 className="text-gray-800 mb-2.5 text-2xl font-bold">RoadMaster Pro</h1>
        <p className="text-gray-600">All services initialized successfully!</p>
        <p className="text-sm text-gray-400">Application core is fully functional.</p>
        <div className="mt-4 text-xs text-gray-600 space-y-1">
          <p>✓ LocalStorage utilities working</p>
          <p>✓ Permissions service working</p>
          <p>✓ Data cache working</p>
          <p>✓ SQLite database working</p>
        </div>
        <button 
          onClick={() => {
            // Try to load the full application
            window.location.href = window.location.href + '?full=true';
          }}
          className="mt-5 px-5 py-2.5 bg-green-600 text-white border-none rounded-md cursor-pointer text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          Try Full Application
        </button>
      </div>
    </div>
  );
};

// Add CSS for spinner animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Mount the test app
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<TestApp />);
} else {
  console.error('Root element not found!');
}