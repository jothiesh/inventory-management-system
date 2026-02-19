package com.company.inventory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * AuditLog Entity
 * 
 * Tracks all important system actions for compliance, debugging, and security.
 * Records who did what, when, and what changed.
 * 
 * Use Cases:
 * - Security auditing
 * - Compliance requirements
 * - Debugging issues
 * - Activity tracking
 * - Change history
 */
@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_user", columnList = "user_id"),
    @Index(name = "idx_audit_date", columnList = "created_at"),
    @Index(name = "idx_audit_table", columnList = "table_name"),
    @Index(name = "idx_audit_action", columnList = "action")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    /**
     * Primary Key
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    /**
     * User who performed the action
     * Can be null for system-generated actions
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    /**
     * Action performed
     * Examples: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, STOCK_IN, STOCK_OUT
     */
    @Column(name = "action", nullable = false, length = 100)
    private String action;

    /**
     * Table/Entity name that was affected
     * Examples: products, categories, stock_movements
     */
    @Column(name = "table_name", length = 50)
    private String tableName;

    /**
     * ID of the record that was affected
     */
    @Column(name = "record_id")
    private Long recordId;

    /**
     * Old value before change (JSON format)
     * Stores the previous state of the record
     */
    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    /**
     * New value after change (JSON format)
     * Stores the new state of the record
     */
    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    /**
     * IP address of the user
     * For security tracking
     */
    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    /**
     * Timestamp when action was performed
     */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * PrePersist callback
     * Sets timestamp before inserting
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /**
     * Enum for common audit actions
     */
    public enum AuditAction {
        CREATE("CREATE"),
        UPDATE("UPDATE"),
        DELETE("DELETE"),
        LOGIN("LOGIN"),
        LOGOUT("LOGOUT"),
        STOCK_IN("STOCK_IN"),
        STOCK_OUT("STOCK_OUT"),
        PRICE_CHANGE("PRICE_CHANGE"),
        STATUS_CHANGE("STATUS_CHANGE"),
        ALERT_CREATED("ALERT_CREATED"),
        ALERT_READ("ALERT_READ"),
        EXPORT_DATA("EXPORT_DATA"),
        IMPORT_DATA("IMPORT_DATA"),
        SYSTEM_INIT("SYSTEM_INIT");

        private final String value;

        AuditAction(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }
    }
}