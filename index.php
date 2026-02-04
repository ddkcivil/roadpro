<?php
session_start();

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'roadmaster');
define('DB_USER', 'root');
define('DB_PASS', '');

// Initialize database connection
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            die("Connection failed: " . $e->getMessage());
        }
    }
    return $pdo;
}

// Create tables if they don't exist
function initializeDatabase() {
    $pdo = getDB();
    
    // Projects table
    $pdo->exec("CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        location VARCHAR(255),
        contractor VARCHAR(255),
        start_date DATE,
        end_date DATE,
        client VARCHAR(255),
        status ENUM('active', 'completed', 'on-hold') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    
    // Daily activities table
    $pdo->exec("CREATE TABLE IF NOT EXISTS daily_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        date DATE NOT NULL,
        activity_type VARCHAR(100) NOT NULL,
        description TEXT,
        progress_percentage DECIMAL(5,2),
        weather VARCHAR(50),
        manpower INT,
        equipment_used TEXT,
        materials_consumed TEXT,
        issues_encountered TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )");
    
    // Users table
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role ENUM('admin', 'manager', 'supervisor', 'worker') DEFAULT 'worker',
        email VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
}

// Initialize database
initializeDatabase();

// Handle authentication
if (isset($_POST['login'])) {
    $username = $_POST['username'];
    $password = $_POST['password'];
    
    $stmt = getDB()->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        header('Location: index.php');
        exit;
    } else {
        $error = "Invalid credentials";
    }
}

// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: index.php');
    exit;
}

// Check if user is logged in
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

// Get current user
function getCurrentUser() {
    if (!isLoggedIn()) return null;
    $stmt = getDB()->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch();
}

// Add new project
if (isset($_POST['add_project']) && isLoggedIn()) {
    $name = $_POST['name'];
    $code = $_POST['code'];
    $location = $_POST['location'];
    $contractor = $_POST['contractor'];
    $start_date = $_POST['start_date'];
    $end_date = $_POST['end_date'];
    $client = $_POST['client'];
    
    $stmt = getDB()->prepare("INSERT INTO projects (name, code, location, contractor, start_date, end_date, client) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$name, $code, $location, $contractor, $start_date, $end_date, $client]);
    
    $success = "Project added successfully";
}

// Add daily activity
if (isset($_POST['add_activity']) && isLoggedIn()) {
    $project_id = $_POST['project_id'];
    $date = $_POST['date'];
    $activity_type = $_POST['activity_type'];
    $description = $_POST['description'];
    $progress = $_POST['progress'];
    $weather = $_POST['weather'];
    $manpower = $_POST['manpower'];
    $equipment = $_POST['equipment'];
    $materials = $_POST['materials'];
    $issues = $_POST['issues'];
    
    $stmt = getDB()->prepare("INSERT INTO daily_activities (project_id, date, activity_type, description, progress_percentage, weather, manpower, equipment_used, materials_consumed, issues_encountered, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$project_id, $date, $activity_type, $description, $progress, $weather, $manpower, $equipment, $materials, $issues, $_SESSION['username']]);
    
    $success = "Daily activity recorded successfully";
}

// Get all projects
function getProjects() {
    $stmt = getDB()->query("SELECT * FROM projects ORDER BY created_at DESC");
    return $stmt->fetchAll();
}

// Get project activities
function getProjectActivities($project_id, $limit = 30) {
    $stmt = getDB()->prepare("SELECT * FROM daily_activities WHERE project_id = ? ORDER BY date DESC, created_at DESC LIMIT ?");
    $stmt->execute([$project_id, $limit]);
    return $stmt->fetchAll();
}

// Get project by ID
function getProject($id) {
    $stmt = getDB()->prepare("SELECT * FROM projects WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch();
}

// Calculate project progress
function getProjectProgress($project_id) {
    $stmt = getDB()->prepare("SELECT AVG(progress_percentage) as avg_progress FROM daily_activities WHERE project_id = ?");
    $stmt->execute([$project_id]);
    $result = $stmt->fetch();
    return $result['avg_progress'] ?? 0;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RoadMaster Pro - Project Activity Tracking</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #2563eb;
            --primary-dark: #1d4ed8;
            --secondary: #64748b;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --light: #f8fafc;
            --dark: #0f172a;
            --gray: #94a3b8;
            --border: #e2e8f0;
        }
        
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
            background: linear-gradient(135deg, var(--primary), #6366f1);
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
            background: linear-gradient(135deg, var(--primary), #6366f1);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
        }
        
        .btn-outline {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--gray);
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
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
        }
        
        .form-control::placeholder {
            color: var(--gray);
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
            background: linear-gradient(135deg, var(--primary), #6366f1);
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
            background: linear-gradient(90deg, var(--success), #34d399);
            border-radius: 4px;
            transition: width 0.5s ease;
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
            color: var(--gray);
            font-weight: 500;
        }
        
        .activity-item {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
            border-left: 4px solid var(--primary);
        }
        
        .activity-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .activity-date {
            font-size: 14px;
            color: var(--gray);
            font-weight: 500;
        }
        
        .activity-type {
            background: rgba(37, 99, 235, 0.2);
            color: #93c5fd;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .activity-progress {
            font-size: 14px;
            font-weight: 600;
            color: var(--success);
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
                    
                    <?php if (isset($error)): ?>
                        <div class="alert alert-error"><?php echo $error; ?></div>
                    <?php endif; ?>
                    
                    <form method="POST">
                        <div class="form-group">
                            <label class="form-label">Username</label>
                            <input type="text" name="username" class="form-control" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" name="password" class="form-control" required>
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
                    <span>Welcome, <?php echo getCurrentUser()['full_name']; ?>!</span>
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
                    
                    <button class="btn btn-primary" onclick="showAddProject()" style="width: 100%; margin-bottom: 12px;">
                        <i class="fas fa-plus"></i> Add New Project
                    </button>
                    
                    <button class="btn btn-outline" onclick="showAddActivity()" style="width: 100%;">
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
                    <p style="color: var(--gray);">Latest project updates will appear here</p>
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
                            
                            <p style="color: var(--gray); margin-bottom: 16px;">
                                <i class="fas fa-map-marker-alt"></i> <?php echo htmlspecialchars($project['location']); ?>
                            </p>
                            
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: <?php echo getProjectProgress($project['id']); ?>%"></div>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: var(--gray); font-size: 14px;">
                                    Progress: <?php echo number_format(getProjectProgress($project['id']), 1); ?>%
                                </span>
                                <button class="btn btn-outline" onclick="viewProject(<?php echo $project['id']; ?>)">
                                    <i class="fas fa-eye"></i> View Details
                                </button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
            
            <!-- Add Project Modal -->
            <div id="addProjectModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center;">
                <div class="card" style="width: 500px; max-width: 90vw;">
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
                                <input type="text" name="name" class="form-control" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Project Code</label>
                                <input type="text" name="code" class="form-control" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Location</label>
                                <input type="text" name="location" class="form-control">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Contractor</label>
                                <input type="text" name="contractor" class="form-control">
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
                                <input type="text" name="client" class="form-control">
                            </div>
                        </div>
                        
                        <button type="submit" name="add_project" class="btn btn-primary" style="width: 100%;">
                            <i class="fas fa-plus"></i> Create Project
                        </button>
                    </form>
                </div>
            </div>
            
            <!-- Add Activity Modal -->
            <div id="addActivityModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center; overflow-y: auto; padding: 20px;">
                <div class="card" style="width: 600px; max-width: 90vw;">
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
                                <input type="number" name="progress" class="form-control" min="0" max="100" step="0.1">
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
                                <input type="number" name="manpower" class="form-control" min="0">
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
        function showAddProject() {
            document.getElementById('addProjectModal').style.display = 'flex';
        }
        
        function showAddActivity() {
            document.getElementById('addActivityModal').style.display = 'flex';
        }
        
        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }
        
        function viewProject(projectId) {
            // This would navigate to project details page
            alert('Project details view would be implemented here');
        }
        
        // Close modals when clicking outside
        window.onclick = function(event) {
            if (event.target.id === 'addProjectModal') {
                closeModal('addProjectModal');
            }
            if (event.target.id === 'addActivityModal') {
                closeModal('addActivityModal');
            }
        }
    </script>
</body>
</html>