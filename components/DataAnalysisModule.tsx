import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  TextField, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import { sqliteService } from '../services/sqliteService';
import { DataSyncService } from '../services/dataSyncService';

const DataAnalysisModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load projects with analytics
      const projectsWithAnalytics = await DataSyncService.getProjectsWithAnalytics();
      setProjects(projectsWithAnalytics);
      
      // Load users
      if (sqliteService.isAvailable()) {
        const usersData = await sqliteService.getAllUsers();
        setUsers(usersData);
      } else {
        // Fallback to localStorage if SQLite is not available
        const usersJson = localStorage.getItem('roadmaster-users');
        setUsers(usersJson ? JSON.parse(usersJson) : []);
      }
      
      // Load reports
      const projectReports = await DataSyncService.getProjectReports();
      setReports(projectReports);
    } catch (err) {
      setError('Failed to load data from SQLite database');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunQuery = async () => {
    if (!query.trim()) return;
    
    try {
      if (sqliteService.isAvailable()) {
        const results = await sqliteService.executeQuery(query);
        setQueryResults(results);
      } else {
        setError('SQLite is not available. Cannot execute queries.');
      }
    } catch (err) {
      setError('Error executing query: ' + (err as Error).message);
      console.error('Query error:', err);
    }
  };

  const handleExportToCSV = () => {
    // Export the current results to CSV
    if (queryResults.length === 0) return;
    
    const headers = Object.keys(queryResults[0]);
    const csvContent = [
      headers.join(','),
      ...queryResults.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', overflowY: 'auto', p: 2 }}>
      <Box display="flex" justifyContent="space-between" mb={2} alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight="900">Data Analysis & Reporting</Typography>
          <Typography variant="body2" color="text.secondary">Offline analytics powered by SQLite</Typography>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
        <Tab label="Dashboard" />
        <Tab label="Projects" />
        <Tab label="Users" />
        <Tab label="Reports" />
        <Tab label="SQL Query" />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="text.secondary">Total Projects</Typography>
                <Typography variant="h4" fontWeight="bold">{projects.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="text.secondary">Total Users</Typography>
                <Typography variant="h4" fontWeight="bold">{users.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="text.secondary">Avg. Progress</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {projects.length > 0 
                    ? `${Math.round(projects.reduce((sum, p) => sum + (p.analytics?.avg_progress || 0), 0) / projects.length)}%` 
                    : '0%'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="text.secondary">Sync Status</Typography>
                <Typography variant="h4" fontWeight="bold">SQLite</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Data Sources</Typography>
                <Typography variant="body2" component="div">
                  <ul>
                    <li>Projects: {projects.length} records</li>
                    <li>Users: {users.length} records</li>
                    <li>Local storage synchronized with SQLite</li>
                    <li>Offline-ready analytics engine</li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>Projects Analysis</Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Contractor</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>BOQ Items</TableCell>
                    <TableCell>RFIs</TableCell>
                    <TableCell>Progress</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map((project, index) => (
                    <TableRow key={index}>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>{project.location}</TableCell>
                      <TableCell>{project.client}</TableCell>
                      <TableCell>{project.contractor}</TableCell>
                      <TableCell>{project.start_date}</TableCell>
                      <TableCell>{project.end_date}</TableCell>
                      <TableCell>{project.boq_items_count || 0}</TableCell>
                      <TableCell>{project.rfis_count || 0}</TableCell>
                      <TableCell>{project.avg_schedule_progress ? `${Math.round(project.avg_schedule_progress)}%` : '0%'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>Users Analysis</Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Phone</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user, index) => (
                    <TableRow key={index}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>Custom Reports</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body1" gutterBottom>
                  Generate custom reports using SQLite queries. Example queries:
                </Typography>
                <Typography variant="body2" component="div">
                  <ul>
                    <li>SELECT * FROM projects WHERE start_date &gt; '2025-01-01'</li>
                    <li>SELECT COUNT(*) as total_projects FROM projects</li>
                    <li>SELECT * FROM boq_items WHERE project_id = 'proj-001' ORDER BY item_no</li>
                    <li>SELECT * FROM rfis WHERE status = 'Open' AND project_id = 'proj-001'</li>
                  </ul>
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 4 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>SQL Query Interface</Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your SQL query here..."
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Box display="flex" gap={2} mb={2}>
              <Button variant="contained" onClick={handleRunQuery}>
                Run Query
              </Button>
              {queryResults.length > 0 && (
                <Button variant="outlined" onClick={handleExportToCSV}>
                  Export to CSV
                </Button>
              )}
              <Button variant="outlined" onClick={() => setQuery('')}>
                Clear
              </Button>
            </Box>
            
            {queryResults.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Results ({queryResults.length} rows)
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {queryResults.length > 0 && Object.keys(queryResults[0]).map(key => (
                          <TableCell key={key}>{key}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {queryResults.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <TableCell key={cellIndex}>{String(value)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DataAnalysisModule;