package com.company.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Generic response DTO for various reports
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportResponse {

	private String reportType;
	private String reportName;
	private LocalDate generatedDate;
	private Map<String, Object> summary;
	private List<Map<String, Object>> data;
	private Map<String, Object> metadata;

	/**
	 * Create stock summary report response
	 */
	public static ReportResponse createStockSummary(Integer totalProducts, Integer productsInStock,
			Integer productsOutOfStock, Integer lowStockProducts) {

		ReportResponse response = new ReportResponse();
		response.setReportType("STOCK_SUMMARY");
		response.setReportName("Stock Summary Report");
		response.setGeneratedDate(LocalDate.now());

		Map<String, Object> summary = Map.of("totalProducts", totalProducts, "productsInStock", productsInStock,
				"productsOutOfStock", productsOutOfStock, "lowStockProducts", lowStockProducts);
		response.setSummary(summary);

		return response;
	}

	/**
	 * Create category-wise report response
	 */
	public static ReportResponse createCategoryWise(List<Map<String, Object>> categoryData) {
		ReportResponse response = new ReportResponse();
		response.setReportType("CATEGORY_WISE");
		response.setReportName("Category-wise Stock Report");
		response.setGeneratedDate(LocalDate.now());
		response.setData(categoryData);

		// Calculate totals
		int totalProducts = categoryData.stream().mapToInt(item -> (Integer) item.get("totalProducts")).sum();

		BigDecimal totalValue = categoryData.stream().map(item -> (BigDecimal) item.get("totalValue"))
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		response.setSummary(Map.of("totalCategories", categoryData.size(), "totalProducts", totalProducts, "totalValue",
				totalValue));

		return response;
	}

	/**
	 * Create dead stock report response
	 */
	public static ReportResponse createDeadStock(List<Map<String, Object>> deadStockData) {
		ReportResponse response = new ReportResponse();
		response.setReportType("DEAD_STOCK");
		response.setReportName("Dead Stock Report");
		response.setGeneratedDate(LocalDate.now());
		response.setData(deadStockData);

		BigDecimal totalBlockedValue = deadStockData.stream().map(item -> (BigDecimal) item.get("blockedValue"))
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		response.setSummary(
				Map.of("totalDeadStockItems", deadStockData.size(), "totalBlockedValue", totalBlockedValue));

		return response;
	}
}