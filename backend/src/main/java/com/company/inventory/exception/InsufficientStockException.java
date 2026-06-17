package com.company.inventory.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.math.BigDecimal;

/**
 * Exception thrown when attempting to issue more stock than available
 * Returns HTTP 400 Bad Request status
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
@Slf4j
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
            productName, requestedQuantity, availableQuantity
        ));
        this.productName = productName;
        this.requestedQuantity = requestedQuantity;
        this.availableQuantity = availableQuantity;
        
        log.warn("Outflow calculation failure boundary matched: Product part '{}' balance levels are insufficient for fulfillment demand parameters. [Demanded subtraction: {}, Physical balance available: {}]", 
                productName, requestedQuantity, availableQuantity);
    }

    /**
     * Constructor with custom message
     * @param message Custom error message
     */
    public InsufficientStockException(String message) {
        super(message);
        log.warn("Outflow calculation failure boundary matched: Stock service validation rules layer dropped message context tracking trace: {}", message);
    }

    /**
     * Constructor with message and cause
     * @param message Error message
     * @param cause Root cause
     */
    public InsufficientStockException(String message, Throwable cause) {
        super(message, cause);
        log.error("Outflow calculation failure boundary matched: Balance calculations pipeline triggered low-level dependency exception context: ", cause);
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