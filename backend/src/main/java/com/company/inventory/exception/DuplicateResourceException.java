package com.company.inventory.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception thrown when attempting to create a resource that already exists
 * Returns HTTP 409 Conflict status
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicateResourceException extends RuntimeException {

    /**
     * Constructor with resource details
     * @param resourceName Name of the resource (e.g., "Product", "Category")
     * @param fieldName Field that is duplicated (e.g., "name", "code")
     * @param fieldValue Value that is duplicated
     */
    public DuplicateResourceException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s already exists with %s: '%s'", resourceName, fieldName, fieldValue));
    }

    /**
     * Constructor with custom message
     * @param message Custom error message
     */
    public DuplicateResourceException(String message) {
        super(message);
    }

    /**
     * Constructor with message and cause
     * @param message Error message
     * @param cause Root cause
     */
    public DuplicateResourceException(String message, Throwable cause) {
        super(message, cause);
    }
}