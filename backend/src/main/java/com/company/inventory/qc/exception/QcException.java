package com.company.inventory.qc.exception;

import lombok.Getter;

/**
 * QC-specific runtime exception with HTTP-like status hint.
 */
@Getter
public class QcException extends RuntimeException {

    private final String code;
    private final int httpStatus;

    // Existing 3-argument constructor
    public QcException(String code, String message, int httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    // NEW 2-argument constructor to support (String code, String message) calls
    public QcException(String code, String message) {
        super(message);
        this.code = code;
        this.httpStatus = 400; // Defaulting to 400 Bad Request
    }

    public static QcException notFound(String message) {
        return new QcException("QC_NOT_FOUND", message, 404);
    }

    public static QcException alreadyInspected(Long batchId) {
        return new QcException("QC_ALREADY_INSPECTED",
                "Batch " + batchId + " has already been inspected", 409);
    }

    public static QcException invalidQuantity(String detail) {
        return new QcException("QC_INVALID_QTY", detail, 400);
    }

    public static QcException badRequest(String message) {
        return new QcException("QC_BAD_REQUEST", message, 400);
    }
}