package com.company.inventory.util;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Date;

/**
 * Utility class for date/time operations
 */
public class DateUtils {
    
    // Date formatters
    public static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    public static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    public static final DateTimeFormatter LOT_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");
    
    private DateUtils() {
        // Private constructor to prevent instantiation
    }
    
    /**
     * Get current date
     */
    public static LocalDate getCurrentDate() {
        return LocalDate.now();
    }
    
    /**
     * Get current date-time
     */
    public static LocalDateTime getCurrentDateTime() {
        return LocalDateTime.now();
    }
    
    /**
     * Convert LocalDate to Date
     */
    public static Date toDate(LocalDate localDate) {
        return Date.from(localDate.atStartOfDay(ZoneId.systemDefault()).toInstant());
    }
    
    /**
     * Convert LocalDateTime to Date
     */
    public static Date toDate(LocalDateTime localDateTime) {
        return Date.from(localDateTime.atZone(ZoneId.systemDefault()).toInstant());
    }
    
    /**
     * Convert Date to LocalDate
     */
    public static LocalDate toLocalDate(Date date) {
        return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
    }
    
    /**
     * Convert Date to LocalDateTime
     */
    public static LocalDateTime toLocalDateTime(Date date) {
        return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
    }
    
    /**
     * Format date for lot number (YYYYMMDD)
     */
    public static String formatForLotNumber(LocalDate date) {
        return date.format(LOT_DATE_FORMATTER);
    }
    
    /**
     * Format date for display
     */
    public static String formatDate(LocalDate date) {
        return date.format(DATE_FORMATTER);
    }
    
    /**
     * Format datetime for display
     */
    public static String formatDateTime(LocalDateTime dateTime) {
        return dateTime.format(DATETIME_FORMATTER);
    }
    
    /**
     * Calculate months between two dates
     */
    public static long monthsBetween(LocalDate startDate, LocalDate endDate) {
        return ChronoUnit.MONTHS.between(startDate, endDate);
    }
    
    /**
     * Calculate days between two dates
     */
    public static long daysBetween(LocalDate startDate, LocalDate endDate) {
        return ChronoUnit.DAYS.between(startDate, endDate);
    }
    
    /**
     * Check if date is older than given months
     */
    public static boolean isOlderThanMonths(LocalDate date, int months) {
        return monthsBetween(date, getCurrentDate()) > months;
    }
    
    /**
     * Check if date is within last N days
     */
    public static boolean isWithinLastDays(LocalDate date, int days) {
        return daysBetween(date, getCurrentDate()) <= days;
    }
    
    /**
     * Get start of day
     */
    public static LocalDateTime getStartOfDay(LocalDate date) {
        return date.atStartOfDay();
    }
    
    /**
     * Get end of day
     */
    public static LocalDateTime getEndOfDay(LocalDate date) {
        return date.atTime(LocalTime.MAX);
    }
    
    /**
     * Get start of month
     */
    public static LocalDate getStartOfMonth(YearMonth yearMonth) {
        return yearMonth.atDay(1);
    }
    
    /**
     * Get end of month
     */
    public static LocalDate getEndOfMonth(YearMonth yearMonth) {
        return yearMonth.atEndOfMonth();
    }
    
    /**
     * Add months to date
     */
    public static LocalDate addMonths(LocalDate date, int months) {
        return date.plusMonths(months);
    }
    
    /**
     * Subtract months from date
     */
    public static LocalDate subtractMonths(LocalDate date, int months) {
        return date.minusMonths(months);
    }
    
    /**
     * Add days to date
     */
    public static LocalDate addDays(LocalDate date, int days) {
        return date.plusDays(days);
    }
    
    /**
     * Subtract days from date
     */
    public static LocalDate subtractDays(LocalDate date, int days) {
        return date.minusDays(days);
    }
    
    /**
     * Parse date string
     */
    public static LocalDate parseDate(String dateString) {
        return LocalDate.parse(dateString, DATE_FORMATTER);
    }
    
    /**
     * Parse datetime string
     */
    public static LocalDateTime parseDateTime(String dateTimeString) {
        return LocalDateTime.parse(dateTimeString, DATETIME_FORMATTER);
    }
}