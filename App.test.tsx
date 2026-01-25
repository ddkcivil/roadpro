import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { UserRole } from './types';
import { LocalStorageUtils } from './utils/localStorageUtils';
import { DataCache } from './utils/cacheUtils';
import { PermissionsService } from './services/permissionsService';
import { sqliteService } from './services/sqliteService';

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
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#fee',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          border: '1px solid #fcc',
          maxWidth: '500px'
        }}>
          <h1 style={{ color: '#c33', marginBottom: '10px' }}>Initialization Error</h1>
          <p style={{ color: '#666', marginBottom: '15px' }}>{error}</p>
          <div style={{ textAlign: 'left', backgroundColor: '#f8f8f8', padding: '10px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
            <p><strong>Debug Info:</strong></p>
            <p>LocalStorage: {LocalStorageUtils.getProjects() ? '✓' : '✗'}</p>
            <p>SQLite Ready: {sqliteReady ? '✓' : '✗'}</p>
            <p>Cache Size: {DataCache.size()}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #4f46e5',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px'
          }}></div>
          <p style={{ color: '#666' }}>Initializing application services...</p>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
            {sqliteReady ? '✓ SQLite ready' : '○ Initializing SQLite...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f0f0f0',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        textAlign: 'center', 
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#333', marginBottom: '10px' }}>RoadMaster Pro</h1>
        <p style={{ color: '#666' }}>All services initialized successfully!</p>
        <p style={{ fontSize: '14px', color: '#999' }}>Application core is fully functional.</p>
        <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
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
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
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