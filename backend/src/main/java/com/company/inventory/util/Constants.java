package com.company.inventory.util;

/**
 * Application-wide constants
 */
public class Constants {
    
    // ============================================
    // USER ROLES
    // ============================================
    public static final String ROLE_OWNER = "OWNER";
    public static final String ROLE_STORE_MANAGER = "STORE_MANAGER";
    
    // ============================================
    // PRODUCT TYPES
    // ============================================
    public static final String PRODUCT_TYPE_PCBA = "PCBA";
    public static final String PRODUCT_TYPE_COMPONENT = "Component";
    public static final String PRODUCT_TYPE_MODULE = "Module";
    public static final String PRODUCT_TYPE_FINISHED = "Finished";
    
    // ============================================
    // UNITS
    // ============================================
    public static final String UNIT_PCS = "pcs";
    public static final String UNIT_SET = "set";
    public static final String UNIT_BOX = "box";
    public static final String UNIT_KG = "kg";
    public static final String UNIT_METER = "meter";
    
    // ============================================
    // MOVEMENT TYPES
    // ============================================
    public static final String MOVEMENT_TYPE_IN = "IN";
    public static final String MOVEMENT_TYPE_OUT = "OUT";
    
    // ============================================
    // TRANSACTION TYPES
    // ============================================
    public static final String TRANSACTION_PURCHASE = "Purchase";
    public static final String TRANSACTION_SALE = "Sale";
    public static final String TRANSACTION_PRODUCTION = "Production";
    public static final String TRANSACTION_DAMAGE = "Damage";
    public static final String TRANSACTION_SCRAP = "Scrap";
    public static final String TRANSACTION_TRANSFER = "Transfer";
    
    // ============================================
    // LOT STATUS
    // ============================================
    public static final String LOT_STATUS_ACTIVE = "Active";
    public static final String LOT_STATUS_DEPLETED = "Depleted";
    public static final String LOT_STATUS_EXPIRED = "Expired";
    
    // ============================================
    // ALERT TYPES
    // ============================================
    public static final String ALERT_DEAD_STOCK = "DEAD_STOCK";
    public static final String ALERT_SLOW_MOVING = "SLOW_MOVING";
    public static final String ALERT_PRICE_CHANGE = "PRICE_CHANGE";
    public static final String ALERT_LOW_STOCK = "LOW_STOCK";
    public static final String ALERT_EXCESS_STOCK = "EXCESS_STOCK";
    
    // ============================================
    // ALERT SEVERITY
    // ============================================
    public static final String SEVERITY_LOW = "LOW";
    public static final String SEVERITY_MEDIUM = "MEDIUM";
    public static final String SEVERITY_HIGH = "HIGH";
    
    // ============================================
    // DEAD STOCK THRESHOLDS
    // ============================================
    public static final int DEAD_STOCK_MONTHS = 12;  // No movement for 12+ months
    public static final int SLOW_MOVING_MONTHS = 6;  // No movement for 6-12 months
    
    // ============================================
    // LOT NUMBER FORMAT
    // ============================================
    public static final String LOT_NUMBER_PREFIX = "LOT-";
    public static final String LOT_NUMBER_FORMAT = "LOT-%s-%04d"; // LOT-YYYYMMDD-0001
    
    // ============================================
    // DEFAULT CATEGORIES
    // ============================================
    public static final String[] DEFAULT_CATEGORIES = {
        "PCBA",
        "Microcontrollers",
        "ICs",
        "Sensors",
        "Communication Modules",
        "Power Components",
        "Passive Components",
        "Connectors",
        "Displays",
        "Relays",
        "Batteries",
        "Antennas",
        "Finished Products"
    };
    
    // ============================================
    // DEFAULT RACKS
    // ============================================
    public static final String[] DEFAULT_RACKS = {
        "R1", "R2", "R3", "R4"
    };
    
    public static final String[] DEFAULT_RACK_NAMES = {
        "Components Rack",
        "PCBA Rack",
        "Modules Rack",
        "Finished Products Rack"
    };
    
    // ============================================
    // API RESPONSE MESSAGES
    // ============================================
    public static final String MSG_SUCCESS = "Operation completed successfully";
    public static final String MSG_CREATED = "Resource created successfully";
    public static final String MSG_UPDATED = "Resource updated successfully";
    public static final String MSG_DELETED = "Resource deleted successfully";
    public static final String MSG_NOT_FOUND = "Resource not found";
    public static final String MSG_DUPLICATE = "Resource already exists";
    public static final String MSG_INVALID_REQUEST = "Invalid request";
    public static final String MSG_UNAUTHORIZED = "Unauthorized access";
    public static final String MSG_FORBIDDEN = "Access forbidden";
    
    // ============================================
    // PAGINATION
    // ============================================
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;
    
    private Constants() {
        // Private constructor to prevent instantiation
    }
}