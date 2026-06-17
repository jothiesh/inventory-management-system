package com.company.inventory.util;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.security.SecureRandom;

public class LotNumberGenerator {

    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final SecureRandom random = new SecureRandom();
    private static final String ALPHA_NUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    public static String generate() {
        String date = formatter.format(LocalDateTime.now());
        
        // Generates a 4-character random alphanumeric string (e.g., K9X2)
        StringBuilder sb = new StringBuilder(4);
        for (int i = 0; i < 4; i++) {
            sb.append(ALPHA_NUMERIC.charAt(random.nextInt(ALPHA_NUMERIC.length())));
        }
        
        return String.format("LOT-%s-%s", date, sb.toString());
    }
}