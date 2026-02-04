<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit();
}

include 'config/database.php';
$db = new Database();
$conn = $db->connect();

// Get user info
$user_id = $_SESSION['user_id'];
$stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user = $stmt->fetch();

// Get today's activities
$today = date('Y-m-d');
$stmt = $conn->prepare("SELECT * FROM activities WHERE user_id = ? AND DATE(created_at) = ? ORDER BY created_at DESC");
$stmt->execute([$user_id, $today]);
$activities = $stmt->fetchAll();

// Get project stats
$stmt = $conn->prepare("SELECT 
    COUNT(*) as total_activities,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_activities,
    SUM(hours_spent) as total_hours
    FROM activities WHERE user_id = ?");
$stmt->execute([$user_id]);
$stats = $stmt->fetch();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - RoadMaster Pro</title>
    <link rel="stylesheet" href="css/styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <div class="dashboard-container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="logo">
                <i class="fas fa-hard-hat"></i>
                <span>RoadMaster<span class="accent">.Pro</span></span>
            </div>
            <nav class="nav-menu">
                <a href="dashboard.php" class="nav-item active">
                    <i class="fas fa-home"></i>
                    <span>Dashboard</span>
                </a>
                <a href="activities.php" class="nav-item">
                    <i class="fas fa-tasks"></i>
                    <span>Activities</span>
                </a>
                <a href="projects.php" class="nav-item">
                    <i class="fas fa-project-diagram"></i>
                    <span>Projects</span>
                </a>
                <a href="reports.php" class="nav-item">
                    <i class="fas fa-chart-bar"></i>
                    <span>Reports</span>
                </a>
                <a href="settings.php" class="nav-item">
                    <i class="fas fa-cog"></i>
                    <span>Settings</span>
                </a>
            </nav>
            <div class="user-profile">
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-info">
                    <span class="user-name"><?php echo htmlspecialchars($user['name']); ?></span>
                    <span class="user-role"><?php echo htmlspecialchars($user['role']); ?></span>
                </div>
                <a href="logout.php" class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i>
                </a>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <header class="top-bar">
                <div class="header-left">
                    <h1>Project Dashboard</h1>
                    <p class="date-display"><?php echo date('l, F j, Y'); ?></p>
                </div>
                <div class="header-right">
                    <button class="btn btn-primary" id="addActivityBtn">
                        <i class="fas fa-plus"></i>
                        Add Activity
                    </button>
                </div>
            </header>

            <!-- Stats Cards -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon bg-blue">
                        <i class="fas fa-tasks"></i>
                    </div>
                    <div class="stat-info">
                        <h3><?php echo $stats['total_activities'] ?? 0; ?></h3>
                        <p>Total Activities</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon bg-green">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-info">
                        <h3><?php echo $stats['completed_activities'] ?? 0; ?></h3>
                        <p>Completed</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon bg-orange">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <h3><?php echo $stats['total_hours'] ?? 0; ?>h</h3>
                        <p>Hours Logged</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon bg-purple">
                        <i class="fas fa-project-diagram"></i>
                    </div>
                    <div class="stat-info">
                        <h3>12</h3>
                        <p>Active Projects</p>
                    </div>
                </div>
            </div>

            <!-- Today's Activities -->
            <div class="section">
                <div class="section-header">
                    <h2>Today's Activities</h2>
                    <span class="activity-count"><?php echo count($activities); ?> activities</span>
                </div>
                <div class="activities-list">
                    <?php if (empty($activities)): ?>
                        <div class="empty-state">
                            <i class="fas fa-clipboard-list"></i>
                            <h3>No activities today</h3>
                            <p>Start tracking your work by adding your first activity</p>
                            <button class="btn btn-primary" id="addFirstActivity">
                                <i class="fas fa-plus"></i>
                                Add Activity
                            </button>
                        </div>
                    <?php else: ?>
                        <?php foreach ($activities as $activity): ?>
                            <div class="activity-item">
                                <div class="activity-header">
                                    <h4><?php echo htmlspecialchars($activity['title']); ?></h4>
                                    <span class="activity-status status-<?php echo $activity['status']; ?>">
                                        <?php echo ucfirst($activity['status']); ?>
                                    </span>
                                </div>
                                <p class="activity-description">
                                    <?php echo htmlspecialchars($activity['description']); ?>
                                </p>
                                <div class="activity-meta">
                                    <span class="activity-project">
                                        <i class="fas fa-project-diagram"></i>
                                        <?php echo htmlspecialchars($activity['project']); ?>
                                    </span>
                                    <span class="activity-time">
                                        <i class="fas fa-clock"></i>
                                        <?php echo $activity['hours_spent']; ?> hours
                                    </span>
                                    <span class="activity-date">
                                        <?php echo date('g:i A', strtotime($activity['created_at'])); ?>
                                    </span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Recent Projects -->
            <div class="section">
                <div class="section-header">
                    <h2>Recent Projects</h2>
                    <a href="projects.php" class="view-all">View All</a>
                </div>
                <div class="projects-grid">
                    <div class="project-card">
                        <div class="project-header">
                            <h3>Highway Construction Phase 2</h3>
                            <span class="project-status status-active">Active</span>
                        </div>
                        <div class="project-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 65%"></div>
                            </div>
                            <span class="progress-text">65% Complete</span>
                        </div>
                        <div class="project-stats">
                            <span><i class="fas fa-user"></i> 12 team members</span>
                            <span><i class="fas fa-calendar"></i> Due: Dec 15, 2024</span>
                        </div>
                    </div>
                    <div class="project-card">
                        <div class="project-header">
                            <h3>Bridge Renovation Project</h3>
                            <span class="project-status status-pending">Pending</span>
                        </div>
                        <div class="project-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 25%"></div>
                            </div>
                            <span class="progress-text">25% Complete</span>
                        </div>
                        <div class="project-stats">
                            <span><i class="fas fa-user"></i> 8 team members</span>
                            <span><i class="fas fa-calendar"></i> Due: Jan 30, 2025</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Add Activity Modal -->
    <div class="modal" id="activityModal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add New Activity</h2>
                <button class="close-modal">&times;</button>
            </div>
            <form id="activityForm" method="POST" action="add_activity.php">
                <div class="form-group">
                    <label for="title">Activity Title</label>
                    <input type="text" id="title" name="title" required>
                </div>
                <div class="form-group">
                    <label for="project">Project</label>
                    <select id="project" name="project" required>
                        <option value="">Select Project</option>
                        <option value="Highway Construction Phase 2">Highway Construction Phase 2</option>
                        <option value="Bridge Renovation Project">Bridge Renovation Project</option>
                        <option value="Road Maintenance Program">Road Maintenance Program</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" name="description" rows="4" required></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="hours">Hours Spent</label>
                        <input type="number" id="hours" name="hours" min="0.5" step="0.5" required>
                    </div>
                    <div class="form-group">
                        <label for="status">Status</label>
                        <select id="status" name="status" required>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Activity</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // Modal functionality
        const modal = document.getElementById('activityModal');
        const addActivityBtn = document.getElementById('addActivityBtn');
        const addFirstActivity = document.getElementById('addFirstActivity');
        const closeButtons = document.querySelectorAll('.close-modal');

        addActivityBtn?.addEventListener('click', () => {
            modal.style.display = 'flex';
        });

        addFirstActivity?.addEventListener('click', () => {
            modal.style.display = 'flex';
        });

        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Form submission
        document.getElementById('activityForm')?.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            fetch('add_activity.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    modal.style.display = 'none';
                    location.reload();
                } else {
                    alert('Error adding activity: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while adding the activity');
            });
        });
    </script>
</body>
</html>