CREATE DATABASE IF NOT EXISTS hubly_ticket CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'hubly_ticket'@'%' IDENTIFIED BY 'hubly_ticket';
GRANT ALL PRIVILEGES ON hubly_ticket.* TO 'hubly_ticket'@'%';
FLUSH PRIVILEGES;
