package com.company.inventory.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception thrown when a requested resource is not found
 * Returns HTTP 404 Not Found status
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
@Slf4j
public class ResourceNotFoundException extends RuntimeException {

    /**
     * Constructor with resource details
     * @param resourceName Name of the resource (e.g., "Product", "Category")
     * @param fieldName Field used for searching (e.g., "id", "name")
     * @param fieldValue Value of the field
     */
    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s not found with %s: '%s'", resourceName, fieldName, fieldValue));
        log.warn("Data index processing query miss: Resource lookup missed matching elements trace mapping profile: {} matching search criterion {}: '{}'", 
                resourceName, fieldName, fieldValue);
    }

    /**
     * Constructor with custom message
     * @param message Custom error message
     */
    public ResourceNotFoundException(String message) {
        super(message);
        log.warn("Data index processing query miss: Standalone trace search miss condition matched exception message: {}", message);
    }

    /**
     * Constructor with message and cause
     * @param message Error message
     * @param cause Root cause
     */
    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause);
        log.error("Data index processing query miss: Lower level execution infrastructure collapsed out on tracking lookup path.", cause);
    }
}