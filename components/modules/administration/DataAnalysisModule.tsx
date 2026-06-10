import React, { useState, useEffect } from 'react';

import { sqliteService } from '../../../services/database/sqliteService';
import { DataSyncService } from '../../../services/database/dataSyncService';

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from '~/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { ScrollArea } from '~/components/ui/scroll-area';


// NOTE: This is a refactored version of the DataAnalysisModule component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

const DataAnalysisModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [, setLoading] = useState(true);
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
    <div className="p-4 h-[calc(100vh-140px)] overflow-y-auto">
      <div className="flex justify-between mb-4 items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Analysis & Reporting</h1>
          <p className="text-sm text-muted-foreground">Offline analytics powered by SQLite</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="sql-query">SQL Query</TabsTrigger>
        </TabsList>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-muted-foreground">Total Projects</h3>
                <p className="text-2xl font-bold">{projects.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-muted-foreground">Total Users</h3>
                <p className="text-2xl font-bold">{users.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-muted-foreground">Avg. Progress</h3>
                <p className="text-2xl font-bold">0%</p> {/* Placeholder */}
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-muted-foreground">Sync Status</h3>
                <p className="text-2xl font-bold">SQLite</p>
              </CardContent>
            </Card>
            <Card className="lg:col-span-full">
              <CardContent>
                <h3 className="text-lg font-semibold mb-2">Data Sources</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  <li>Projects: {projects.length} records</li>
                  <li>Users: {users.length} records</li>
                  <li>Local storage synchronized with SQLite</li>
                  <li>Offline-ready analytics engine</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">Projects Analysis</h3>
              <ScrollArea className="h-[400px] w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Contractor</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>BOQ Items</TableHead>
                      <TableHead>RFIs</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
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
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">Users Analysis</h3>
              <ScrollArea className="h-[400px] w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Phone</TableHead>
                    </TableRow>
                  </TableHeader>
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
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">Custom Reports</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate custom reports using SQLite queries. Example queries:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><code>SELECT * FROM projects WHERE start_date &gt; '2025-01-01'</code></li>
                <li><code>SELECT COUNT(*) as total_projects FROM projects</code></li>
                <li><code>SELECT * FROM boq_items WHERE project_id = 'proj-001' ORDER BY item_no</code></li>
                <li><code>SELECT * FROM rfis WHERE status = 'Open' AND project_id = 'proj-001'</code></li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sql-query">
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">SQL Query Interface</h3>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your SQL query here..."
                rows={4}
                className="mb-4"
              />
              <div className="flex gap-2 mb-4">
                <Button onClick={handleRunQuery}>Run Query</Button>
                {queryResults.length > 0 && (
                  <Button variant="outline" onClick={handleExportToCSV}>Export to CSV</Button>
                )}
                <Button variant="outline" onClick={() => setQuery('')}>Clear</Button>
              </div>
              
              {queryResults.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Results ({queryResults.length} rows)</h3>
                  <ScrollArea className="h-[300px] w-full rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(queryResults[0]).map(key => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queryResults.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {Object.values(row).map((value, cellIndex) => (
                              <TableCell key={cellIndex}>{String(value)}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataAnalysisModule;
