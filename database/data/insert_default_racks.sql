-- Insert Default Users
-- Password: owner123 (BCrypt hashed)
INSERT INTO users (username, password_hash, full_name, role, email, phone, is_active) VALUES
('owner', '$2a$10$Zy8VxW6QYVhE3fKGZR5xF.j5nBqX8YvJGwQN3L4xPQp8KF5vB4eXO', 'General Manager', 'OWNER', 'owner@company.com', '1234567890', TRUE);

-- Password: manager123 (BCrypt hashed)
INSERT INTO users (username, password_hash, full_name, role, email, phone, is_active) VALUES
('manager', '$2a$10$Xy7VwX5QYVhD2eKFZQ4wE.i4mAqW7XuIFvPN2K3wOPo7JE4uA3dWN', 'Store Manager', 'STORE_MANAGER', 'manager@company.com', '0987654321', TRUE);

-- Note: Use Spring Boot's passwordEncoder.encode("password") to generate actual hashes