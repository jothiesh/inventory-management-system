package com.company.inventory.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception thrown when attempting to create a resource that already exists
 * Returns HTTP 409 Conflict status
 */
@ResponseStatus(HttpStatus.CONFLICT)
@Slf4j
public class DuplicateResourceException extends RuntimeException {

    /**
     * Constructor with resource details
     * @param resourceName Name of the resource (e.g., "Product", "Category")
     * @param fieldName Field that is duplicated (e.g., "name", "code")
     * @param fieldValue Value that is duplicated
     */
    public DuplicateResourceException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s already exists with %s: '%s'", resourceName, fieldName, fieldValue));
        log.warn("Constraint boundary conflict: Duplicate resource constraint triggered for {} matching field path {}: '{}'", 
                resourceName, fieldName, fieldValue);
    }

    /**
     * Constructor with custom message
     * @param message Custom error message
     */
    public DuplicateResourceException(String message) {
        super(message);
        log.warn("Constraint boundary conflict: Unique validation interceptor dropped signature message: {}", message);
    }

    /**
     * Constructor with message and cause
     * @param message Error message
     * @param cause Root cause
     */
    public DuplicateResourceException(String message, Throwable cause) {
        super(message, cause);
        log.error("Constraint boundary conflict: Deep system layer sequence crash caused by constraint overlap parameter.", cause);
    }
}