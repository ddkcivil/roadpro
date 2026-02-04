<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit();
}

// In a real application, you would validate and sanitize the input
$title = $_POST['title'] ?? '';
$project = $_POST['project'] ?? '';
$description = $_POST['description'] ?? '';
$hours = $_POST['hours'] ?? 0;
$status = $_POST['status'] ?? 'pending';

if (empty($title) || empty($project) || empty($description) || $hours <= 0) {
    echo json_encode(['success' => false, 'message' => 'All fields are required']);
    exit();
}

// Database connection
include 'config/database.php';
$db = new Database();
$conn = $db->connect();

try {
    $stmt = $conn->prepare("INSERT INTO activities (user_id, title, project, description, hours_spent, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    $result = $stmt->execute([
        $_SESSION['user_id'],
        $title,
        $project,
        $description,
        $hours,
        $status
    ]);
    
    if ($result) {
        echo json_encode(['success' => true, 'message' => 'Activity added successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to add activity']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>