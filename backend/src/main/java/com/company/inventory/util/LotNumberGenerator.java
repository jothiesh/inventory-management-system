package com.company.inventory.util;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicInteger;

public class LotNumberGenerator {

    private static final AtomicInteger counter = new AtomicInteger(0);
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");

    public static String generate() {
        String date = LocalDateTime.now().format(formatter);
        int count = counter.incrementAndGet();
        if (count > 9999) {
            counter.set(1);
            count = 1;
        }
        return String.format("LOT-%s-%04d", date, count);
    }
}