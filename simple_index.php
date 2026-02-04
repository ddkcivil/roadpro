<?php
// Simple RoadMaster.pro - Project Activity Tracking
session_start();

// Simple in-memory data storage (for demo purposes)
if (!isset($_SESSION['projects'])) {
    $_SESSION['projects'] = [
        [
            'id' => 1,
            'name' => 'Highway Construction Project',
            'code' => 'HCP-2024-001',
            'location' => 'Kathmandu-Lalitpur Corridor',
            'contractor' => 'Nepal Infrastructure Ltd',
            'start_date' => '2024-01-15',
            'end_date' => '2024-12-31',
            'client' => 'Department of Roads',
            'status' => 'active'
        ],
        [
            'id' => 2,
            'name' => 'Bridge Rehabilitation',
            'code' => 'BR-2024-002',
            'location' => 'Pokhara-Baglung Highway',
            'contractor' => 'Himalayan Construction',
            'start_date' => '2024-02-01',
            'end_date' => '2024-08-30',
            'client' => 'Nepal Government',
            'status' => 'active'
        ]
    ];
}

if (!isset($_SESSION['activities'])) {
    $_SESSION['activities'] = [
        [
            'id' => 1,
            'project_id' => 1,
            'date' => date('Y-m-d'),
            'activity_type' => 'Site Preparation',
            'description' => 'Completed earthwork and site clearing for 2.5km section',
            'progress_percentage' => 15.5,
            'weather' => 'Sunny',
            'manpower' => 25,
            'equipment_used' => 'Excavators, Bulldozers, Trucks',
            'materials_consumed' => 'Cement: 500 bags, Sand: 100 tons',
            'issues_encountered' => 'Minor delay due to equipment breakdown',
            'created_by' => 'admin',
            'created_at' => date('Y-m-d H:i:s')
        ]
    ];
}

// Handle login
if (isset($_POST['login'])) {
    $username = $_POST['username'];
    $password = $_POST['password'];
    
    // Simple authentication (demo)
    if ($username === 'admin' && $password === 'password') {
        $_SESSION['user_id'] = 1;
        $_SESSION['username'] = 'admin';
        $_SESSION['role'] = 'admin';
        $_SESSION['full_name'] = 'System Administrator';
    } else {
        $error = "Invalid credentials. Use: admin/password";
    }
}

// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: simple_index.php');
    exit;
}

// Check if user is logged in
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

// Get projects
function getProjects() {
    return $_SESSION['projects'] ?? [];
}

// Get activities
function getActivities() {
    return $_SESSION['activities'] ?? [];
}

// Add project
if (isset($_POST['add_project']) && isLoggedIn()) {
    $newProject = [
        'id' => count($_SESSION['projects']) + 1,
        'name' => $_POST['name'],
        'code' => $_POST['code'],
        'location' => $_POST['location'],
        'contractor' => $_POST['contractor'],
        'start_date' => $_POST['start_date'],
        'end_date' => $_POST['end_date'],
        'client' => $_POST['client'],
        'status' => 'active'
    ];
    
    $_SESSION['projects'][] = $newProject;
    $success = "Project added successfully!";
}

// Add activity
if (isset($_POST['add_activity']) && isLoggedIn()) {
    $newActivity = [
        'id' => count($_SESSION['activities']) + 1,
        'project_id' => $_POST['project_id'],
        'date' => $_POST['date'],
        'activity_type' => $_POST['activity_type'],
        'description' => $_POST['description'],
        'progress_percentage' => $_POST['progress'] ?? 0,
        'weather' => $_POST['weather'],
        'manpower' => $_POST['manpower'],
        'equipment_used' => $_POST['equipment'],
        'materials_consumed' => $_POST['materials'],
        'issues_encountered' => $_POST['issues'],
        'created_by' => $_SESSION['username'],
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    $_SESSION['activities'][] = $newActivity;
    $success = "Daily activity recorded successfully!";
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RoadMaster Pro - Project Activity Tracking</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #f8fafc;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 30px;
        }
        
        .logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .logo-icon {
            background: linear-gradient(135deg, #2563eb, #6366f1);
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
        }
        
        .logo-text {
            font-size: 24px;
            font-weight: 800;
            background: linear-gradient(135deg, #818cf8, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .card-title {
            font-size: 20px;
            font-weight: 700;
            color: #f8fafc;
        }
        
        .btn {
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #2563eb, #6366f1);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
        }
        
        .btn-outline {
            background: transparent;
            border: 1px solid rgba(255,255,255,0.2);
            color: #94a3b8;
        }
        
        .btn-outline:hover {
            background: rgba(255,255,255,0.1);
            color: #f8fafc;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #e2e8f0;
        }
        
        .form-control {
            width: 100%;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.2);
            background: rgba(255,255,255,0.05);
            color: #f8fafc;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        
        .form-control:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
        }
        
        .form-control::placeholder {
            color: #94a3b8;
        }
        
        .grid {
            display: grid;
            gap: 24px;
        }
        
        .grid-cols-2 {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .grid-cols-3 {
            grid-template-columns: repeat(3, 1fr);
        }
        
        .alert {
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-weight: 500;
        }
        
        .alert-success {
            background: rgba(16, 185, 129, 0.2);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #6ee7b7;
        }
        
        .alert-error {
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
        }
        
        .project-card {
            background: rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s ease;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .project-card:hover {
            transform: translateY(-4px);
            background: rgba(255, 255, 255, 0.12);
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
        }
        
        .project-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        
        .project-title {
            font-size: 18px;
            font-weight: 700;
            color: #f8fafc;
        }
        
        .project-code {
            background: linear-gradient(135deg, #2563eb, #6366f1);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
        }
        
        .progress-bar {
            height: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            overflow: hidden;
            margin: 16px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #34d399);
            border-radius: 4px;
            transition: width 0.5s ease;
        }
        
        .login-container {
            max-width: 400px;
            margin: 100px auto;
            text-align: center;
        }
        
        .login-form {
            background: rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 40px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin: 24px 0;
        }
        
        .stat-card {
            background: rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .stat-value {
            font-size: 28px;
            font-weight: 800;
            color: #f8fafc;
            margin-bottom: 8px;
        }
        
        .stat-label {
            font-size: 14px;
            color: #94a3b8;
            font-weight: 500;
        }
        
        @media (max-width: 768px) {
            .grid-cols-2, .grid-cols-3 {
                grid-template-columns: 1fr;
            }
            
            .header {
                flex-direction: column;
                gap: 16px;
                text-align: center;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
        
        /* Modal styles */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        
        .modal-content {
            background: #1e293b;
            border-radius: 16px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25);
        }
    </style>
</head>
<body>
    <div class="container">
        <?php if (!isLoggedIn()): ?>
            <!-- Login Page -->
            <div class="login-container">
                <div class="logo" style="justify-content: center; margin-bottom: 30px;">
                    <div class="logo-icon">
                        <i class="fas fa-hard-hat"></i>
                    </div>
                    <div class="logo-text">RoadMaster<span style="color: #818cf8;">.Pro</span></div>
                </div>
                
                <div class="login-form">
                    <h2 style="margin-bottom: 30px; color: #f8fafc; font-weight: 700;">Project Activity Tracking</h2>
                    
                    <div class="alert alert-success">
                        Demo credentials: <strong>admin</strong> / <strong>password</strong>
                    </div>
                    
                    <?php if (isset($error)): ?>
                        <div class="alert alert-error"><?php echo $error; ?></div>
                    <?php endif; ?>
                    
                    <form method="POST">
                        <div class="form-group">
                            <label class="form-label">Username</label>
                            <input type="text" name="username" class="form-control" value="admin" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" name="password" class="form-control" value="password" required>
                        </div>
                        
                        <button type="submit" name="login" class="btn btn-primary" style="width: 100%;">
                            <i class="fas fa-sign-in-alt"></i> Sign In
                        </button>
                    </form>
                </div>
            </div>
        <?php else: ?>
            <!-- Main Application -->
            <div class="header">
                <div class="logo">
                    <div class="logo-icon">
                        <i class="fas fa-hard-hat"></i>
                    </div>
                    <div class="logo-text">RoadMaster<span style="color: #818cf8;">.Pro</span></div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 16px;">
                    <span>Welcome, <?php echo $_SESSION['full_name']; ?>!</span>
                    <a href="?logout" class="btn btn-outline">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </div>
            
            <?php if (isset($success)): ?>
                <div class="alert alert-success"><?php echo $success; ?></div>
            <?php endif; ?>
            
            <!-- Dashboard -->
            <div class="grid grid-cols-3">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Quick Actions</h3>
                    </div>
                    
                    <button class="btn btn-primary" onclick="showModal('addProjectModal')" style="width: 100%; margin-bottom: 12px;">
                        <i class="fas fa-plus"></i> Add New Project
                    </button>
                    
                    <button class="btn btn-outline" onclick="showModal('addActivityModal')" style="width: 100%;">
                        <i class="fas fa-clipboard-list"></i> Record Daily Activity
                    </button>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Project Statistics</h3>
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value"><?php echo count(getProjects()); ?></div>
                            <div class="stat-label">Total Projects</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">
                                <?php 
                                $active_projects = array_filter(getProjects(), function($p) { return $p['status'] == 'active'; });
                                echo count($active_projects);
                                ?>
                            </div>
                            <div class="stat-label">Active Projects</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Recent Activity</h3>
                    </div>
                    <p style="color: #94a3b8;">Latest project updates will appear here</p>
                </div>
            </div>
            
            <!-- Projects List -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Projects</h3>
                </div>
                
                <div class="grid grid-cols-2">
                    <?php foreach (getProjects() as $project): ?>
                        <div class="project-card">
                            <div class="project-header">
                                <h4 class="project-title"><?php echo htmlspecialchars($project['name']); ?></h4>
                                <span class="project-code"><?php echo htmlspecialchars($project['code']); ?></span>
                            </div>
                            
                            <p style="color: #94a3b8; margin-bottom: 16px;">
                                <i class="fas fa-map-marker-alt"></i> <?php echo htmlspecialchars($project['location']); ?>
                            </p>
                            
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 25%"></div>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #94a3b8; font-size: 14px;">
                                    Progress: 25%
                                </span>
                                <button class="btn btn-outline" onclick="alert('Project details would be shown here')">
                                    <i class="fas fa-eye"></i> View Details
                                </button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
            
            <!-- Add Project Modal -->
            <div id="addProjectModal" class="modal">
                <div class="modal-content">
                    <div class="card-header">
                        <h3 class="card-title">Add New Project</h3>
                        <button onclick="closeModal('addProjectModal')" class="btn btn-outline">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <form method="POST">
                        <div class="grid grid-cols-2">
                            <div class="form-group">
                                <label class="form-label">Project Name</label>
                                <input type="text" name="name" class="form-control" placeholder="Enter project name" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Project Code</label>
                                <input type="text" name="code" class="form-control" placeholder="e.g., HCP-2024-003" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Location</label>
                                <input type="text" name="location" class="form-control" placeholder="Project location">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Contractor</label>
                                <input type="text" name="contractor" class="form-control" placeholder="Contractor name">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" name="start_date" class="form-control" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">End Date</label>
                                <input type="date" name="end_date" class="form-control">
                            </div>
                            
                            <div class="form-group" style="grid-column: span 2;">
                                <label class="form-label">Client</label>
                                <input type="text" name="client" class="form-control" placeholder="Client organization">
                            </div>
                        </div>
                        
                        <button type="submit" name="add_project" class="btn btn-primary" style="width: 100%;">
                            <i class="fas fa-plus"></i> Create Project
                        </button>
                    </form>
                </div>
            </div>
            
            <!-- Add Activity Modal -->
            <div id="addActivityModal" class="modal">
                <div class="modal-content">
                    <div class="card-header">
                        <h3 class="card-title">Record Daily Activity</h3>
                        <button onclick="closeModal('addActivityModal')" class="btn btn-outline">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <form method="POST">
                        <div class="form-group">
                            <label class="form-label">Project</label>
                            <select name="project_id" class="form-control" required>
                                <option value="">Select Project</option>
                                <?php foreach (getProjects() as $project): ?>
                                    <option value="<?php echo $project['id']; ?>">
                                        <?php echo htmlspecialchars($project['name']); ?> (<?php echo htmlspecialchars($project['code']); ?>)
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        
                        <div class="grid grid-cols-2">
                            <div class="form-group">
                                <label class="form-label">Date</label>
                                <input type="date" name="date" class="form-control" value="<?php echo date('Y-m-d'); ?>" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Activity Type</label>
                                <select name="activity_type" class="form-control" required>
                                    <option value="">Select Type</option>
                                    <option value="Site Preparation">Site Preparation</option>
                                    <option value="Excavation">Excavation</option>
                                    <option value="Foundation Work">Foundation Work</option>
                                    <option value="Structural Work">Structural Work</option>
                                    <option value="Paving">Paving</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Inspection">Inspection</option>
                                    <option value="Meeting">Meeting</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Progress (%)</label>
                                <input type="number" name="progress" class="form-control" min="0" max="100" step="0.1" placeholder="0-100">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Weather</label>
                                <select name="weather" class="form-control">
                                    <option value="Sunny">Sunny</option>
                                    <option value="Cloudy">Cloudy</option>
                                    <option value="Rainy">Rainy</option>
                                    <option value="Windy">Windy</option>
                                    <option value="Snowy">Snowy</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Manpower</label>
                                <input type="number" name="manpower" class="form-control" min="0" placeholder="Number of workers">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Equipment Used</label>
                                <input type="text" name="equipment" class="form-control" placeholder="Comma separated">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea name="description" class="form-control" rows="3" placeholder="Describe today's activities..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Materials Consumed</label>
                            <textarea name="materials" class="form-control" rows="2" placeholder="List materials used..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Issues Encountered</label>
                            <textarea name="issues" class="form-control" rows="2" placeholder="Any problems or delays..."></textarea>
                        </div>
                        
                        <button type="submit" name="add_activity" class="btn btn-primary" style="width: 100%;">
                            <i class="fas fa-save"></i> Record Activity
                        </button>
                    </form>
                </div>
            </div>
            
        <?php endif; ?>
    </div>
    
    <script>
        function showModal(modalId) {
            document.getElementById(modalId).style.display = 'flex';
        }
        
        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }
        
        // Close modals when clicking outside
        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        }
        
        // Auto-close success messages after 5 seconds
        setTimeout(function() {
            const successAlerts = document.querySelectorAll('.alert-success');
            successAlerts.forEach(alert => {
                alert.style.opacity = '0';
                setTimeout(() => alert.remove(), 300);
            });
        }, 5000);
    </script>
</body>
</html>