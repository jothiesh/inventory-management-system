package com.company.inventory.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.math.BigDecimal;

/**
 * Exception thrown when attempting to issue more stock than available
 * Returns HTTP 400 Bad Request status
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InsufficientStockException extends RuntimeException {

    private String productName;
    private BigDecimal requestedQuantity;
    private BigDecimal availableQuantity;

    /**
     * Constructor with stock details
     * @param productName Name of the product
     * @param requestedQuantity Quantity requested
     * @param availableQuantity Quantity available
     */
    public InsufficientStockException(String productName, BigDecimal requestedQuantity, BigDecimal availableQuantity) {
        super(String.format(
            "Insufficient stock for product '%s'. Requested: %s, Available: %s",
            productName,
            requestedQuantity,
            availableQuantity
        ));
        this.productName = productName;
        this.requestedQuantity = requestedQuantity;
        this.availableQuantity = availableQuantity;
    }

    /**
     * Constructor with custom message
     * @param message Custom error message
     */
    public InsufficientStockException(String message) {
        super(message);
    }

    /**
     * Constructor with message and cause
     * @param message Error message
     * @param cause Root cause
     */
    public InsufficientStockException(String message, Throwable cause) {
        super(message, cause);
    }

    // Getters
    public String getProductName() {
        return productName;
    }

    public BigDecimal getRequestedQuantity() {
        return requestedQuantity;
    }

    public BigDecimal getAvailableQuantity() {
        return availableQuantity;
    }
}