package com.company.inventory.util;



import java.math.BigDecimal;

public class AmountToWordsUtil {

    private static final String[] ONES = {
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
        "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
        "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    };

    private static final String[] TENS = {
        "", "", "Twenty", "Thirty", "Forty", "Fifty",
        "Sixty", "Seventy", "Eighty", "Ninety"
    };

    public static String convert(BigDecimal amount) {
        long rupees = amount.longValue();
        int paise = amount.remainder(BigDecimal.ONE)
                          .multiply(BigDecimal.valueOf(100))
                          .intValue();

        String result = "Rupees " + convertNumber(rupees) + " Only";

        if (paise > 0) {
            result = "Rupees " + convertNumber(rupees)
                   + " and " + convertNumber(paise) + " Paise Only";
        }

        return result;
    }

    private static String convertNumber(long number) {
        if (number == 0) return "Zero";

        if (number < 20) return ONES[(int) number];

        if (number < 100)
            return TENS[(int) number / 10]
                   + (number % 10 != 0 ? " " + ONES[(int) number % 10] : "");

        if (number < 1000)
            return ONES[(int) number / 100] + " Hundred"
                   + (number % 100 != 0 ? " " + convertNumber(number % 100) : "");

        if (number < 100000)
            return convertNumber(number / 1000) + " Thousand"
                   + (number % 1000 != 0 ? " " + convertNumber(number % 1000) : "");

        if (number < 10000000)
            return convertNumber(number / 100000) + " Lakh"
                   + (number % 100000 != 0 ? " " + convertNumber(number % 100000) : "");

        return convertNumber(number / 10000000) + " Crore"
               + (number % 10000000 != 0 ? " " + convertNumber(number % 10000000) : "");
    }
}