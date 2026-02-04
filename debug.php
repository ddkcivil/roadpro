<?php
// Simple debug page to check what's working
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>RoadMaster Pro Debug</h1>";

// Check if PHP is working
echo "<p>PHP Version: " . phpversion() . "</p>";

// Check database connection
try {
    $pdo = new PDO("mysql:host=localhost;dbname=roadmaster", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<p style='color: green;'>✓ Database connection successful</p>";
    
    // Check if tables exist
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "<p>Tables found: " . implode(', ', $tables) . "</p>";
    
} catch (PDOException $e) {
    echo "<p style='color: red;'>✗ Database connection failed: " . $e->getMessage() . "</p>";
    echo "<p>Creating database and tables...</p>";
    
    // Try to create database
    try {
        $pdo = new PDO("mysql:host=localhost", "root", "");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec("CREATE DATABASE IF NOT EXISTS roadmaster");
        $pdo->exec("USE roadmaster");
        echo "<p style='color: green;'>✓ Database created successfully</p>";
        
        // Create tables
        $pdo->exec("CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            role ENUM('admin', 'manager', 'supervisor', 'worker') DEFAULT 'worker',
            email VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
        
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
        
        echo "<p style='color: green;'>✓ Tables created successfully</p>";
        
        // Create default admin user
        $password = password_hash('admin123', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT IGNORE INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)");
        $stmt->execute(['admin', $password, 'Administrator', 'admin']);
        echo "<p style='color: green;'>✓ Default admin user created (username: admin, password: admin123)</p>";
        
    } catch (PDOException $e) {
        echo "<p style='color: red;'>✗ Failed to create database: " . $e->getMessage() . "</p>";
    }
}

echo "<p><a href='index.php' style='color: blue; text-decoration: underline;'>Go to Main Application</a></p>";
?>