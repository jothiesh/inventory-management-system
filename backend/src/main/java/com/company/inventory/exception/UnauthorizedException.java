package com.company.inventory.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception thrown when a user attempts to access a resource without proper authorization
 * Returns HTTP 401 Unauthorized status
 */
@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class UnauthorizedException extends RuntimeException {

    /**
     * Default constructor
     */
    public UnauthorizedException() {
        super("Unauthorized access");
    }

    /**
     * Constructor with custom message
     * @param message Error message
     */
    public UnauthorizedException(String message) {
        super(message);
    }

    /**
     * Constructor with message and cause
     * @param message Error message
     * @param cause Root cause
     */
    public UnauthorizedException(String message, Throwable cause) {
        super(message, cause);
    }

    /**
     * Constructor for resource-specific unauthorized access
     * @param resourceName Name of the resource
     * @param action Action being attempted
     */
    public UnauthorizedException(String resourceName, String action) {
        super(String.format("Unauthorized to %s %s", action, resourceName));
    }
}