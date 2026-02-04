<?php
session_start();
if (isset($_SESSION['user_id'])) {
    header('Location: dashboard.php');
    exit();
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = $_POST['email'];
    $password = $_POST['password'];
    
    // Simple authentication (in production, use proper password hashing)
    if ($email === 'admin@roadmaster.pro' && $password === 'admin123') {
        $_SESSION['user_id'] = 1;
        $_SESSION['user_name'] = 'Admin User';
        $_SESSION['user_role'] = 'Administrator';
        header('Location: dashboard.php');
        exit();
    } else {
        $error = 'Invalid credentials';
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - RoadMaster Pro</title>
    <link rel="stylesheet" href="css/styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="login-page">
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <div class="logo">
                    <i class="fas fa-hard-hat"></i>
                    <span>RoadMaster<span class="accent">.Pro</span></span>
                </div>
                <h1>Welcome Back</h1>
                <p>Sign in to continue to your dashboard</p>
            </div>
            
            <?php if ($error): ?>
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <?php echo $error; ?>
                </div>
            <?php endif; ?>
            
            <form method="POST" class="login-form">
                <div class="form-group">
                    <label for="email">Email Address</label>
                    <div class="input-with-icon">
                        <i class="fas fa-envelope"></i>
                        <input type="email" id="email" name="email" placeholder="Enter your email" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="password">Password</label>
                    <div class="input-with-icon">
                        <i class="fas fa-lock"></i>
                        <input type="password" id="password" name="password" placeholder="Enter your password" required>
                    </div>
                </div>
                
                <div class="form-options">
                    <label class="checkbox-container">
                        <input type="checkbox" name="remember">
                        <span class="checkmark"></span>
                        Remember me
                    </label>
                    <a href="#" class="forgot-password">Forgot password?</a>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-sign-in-alt"></i>
                    Sign In
                </button>
            </form>
            
            <div class="login-footer">
                <p>Demo credentials:</p>
                <p>Email: <strong>admin@roadmaster.pro</strong></p>
                <p>Password: <strong>admin123</strong></p>
            </div>
        </div>
        
        <div class="login-illustration">
            <div class="illustration-content">
                <i class="fas fa-hard-hat illustration-icon"></i>
                <h2>Project Activity Tracking</h2>
                <p>Monitor and manage your construction projects with precision and efficiency</p>
                <ul class="features-list">
                    <li><i class="fas fa-check"></i> Real-time activity tracking</li>
                    <li><i class="fas fa-check"></i> Project progress monitoring</li>
                    <li><i class="fas fa-check"></i> Team collaboration tools</li>
                    <li><i class="fas fa-check"></i> Detailed reporting</li>
                </ul>
            </div>
        </div>
    </div>
</body>
</html>