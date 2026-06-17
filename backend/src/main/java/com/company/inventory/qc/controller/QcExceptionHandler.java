package com.company.inventory.qc.controller;

import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.qc.exception.QcException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Maps QcException → proper HTTP status + ApiResponse JSON shape used
 * everywhere else in this project.
 *
 * Annotated with @RestControllerAdvice(basePackages) so this advice only
 * fires for QC controllers — keeps the existing GlobalExceptionHandler
 * undisturbed for the rest of the app.
 */
@Slf4j
@RestControllerAdvice(basePackages = "com.company.inventory.qc.controller")
public class QcExceptionHandler {

    @ExceptionHandler(QcException.class)
    public ResponseEntity<ApiResponse<String>> handle(QcException ex) {
        log.warn("QC specialized Exception Intercepted! Code: [{}], HTTP Status Flag: {}, Message: '{}'", 
                ex.getCode(), ex.getHttpStatus(), ex.getMessage());
                
        HttpStatus status = HttpStatus.resolve(ex.getHttpStatus());
        if (status == null) {
            log.trace("Unable to resolve incoming status code parameter [{}]. Defaulting fallback to BAD_REQUEST (400).", ex.getHttpStatus());
            status = HttpStatus.BAD_REQUEST;
        }
        
        log.debug("Formatting payload translation mapping response context matching global contract design models schema wrapper shapes.");
        return ResponseEntity.status(status)
                .body(ApiResponse.error(ex.getMessage()));
    }
}