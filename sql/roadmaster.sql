-- RoadMaster Pro Database Schema

CREATE DATABASE IF NOT EXISTS roadmaster;
USE roadmaster;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'engineer', 'worker') DEFAULT 'worker',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status ENUM('planning', 'active', 'completed', 'on_hold') DEFAULT 'planning',
    budget DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Activities table
CREATE TABLE activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    project_id INT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    hours_spent DECIMAL(5,2) NOT NULL,
    status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Insert sample data
INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@roadmaster.pro', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Project Manager', 'manager@roadmaster.pro', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager'),
('Lead Engineer', 'engineer@roadmaster.pro', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'engineer');

INSERT INTO projects (name, description, start_date, end_date, status, budget) VALUES 
('Highway Construction Phase 2', 'Construction of 15km highway segment including bridges and drainage systems', '2024-01-15', '2024-12-15', 'active', 15000000.00),
('Bridge Renovation Project', 'Renovation and strengthening of existing bridge structure', '2024-03-01', '2025-01-30', 'active', 8500000.00),
('Road Maintenance Program', 'Annual maintenance program for regional road network', '2024-01-01', '2024-12-31', 'active', 3200000.00);

-- Insert sample activities
INSERT INTO activities (user_id, project_id, title, description, hours_spent, status) VALUES 
(1, 1, 'Site Survey and Planning', 'Conducted detailed site survey for highway alignment and prepared construction plans', 8.5, 'completed'),
(2, 1, 'Material Procurement', 'Coordinated procurement of construction materials including concrete and steel', 4.0, 'in_progress'),
(3, 2, 'Structural Analysis', 'Performed detailed structural analysis of bridge components', 6.0, 'completed'),
(1, 3, 'Equipment Maintenance', 'Routine maintenance of construction equipment and vehicles', 3.5, 'completed');