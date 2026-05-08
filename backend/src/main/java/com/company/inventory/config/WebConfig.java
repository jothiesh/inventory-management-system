package com.company.inventory.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {

        // 1. Serve /assets/** (Vite build - JS, CSS)
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/assets/")
                .setCachePeriod(31536000)
                .resourceChain(true);

        // 2. Serve static files only
        registry.addResourceHandler(
                        "/favicon.ico", "/thinlogo.png", "/vite.svg",
                        "/*.png", "/*.ico", "/*.svg", "/*.js", "/*.css",
                        "/index.html"
                )
                .addResourceLocations("classpath:/static/")
                .resourceChain(true);
    }

    // Forward all React Router paths to index.html
    // /api/** is NOT listed here so Spring controllers handle it normally
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        String[] routes = {
            "/",
            "/login",
            "/dashboard",
            "/categories",
            "/products",
            "/racks",
            "/suppliers",
            "/stock-in",
            "/stock-out",
            "/current-stock",
            "/alerts",
            "/reports",
            "/excel-import",
            "/purchase-orders",
            "/purchase-orders/new",
            "/purchase-requests",
            "/purchase-requests/new",
        };
        for (String route : routes) {
            registry.addViewController(route).setViewName("forward:/index.html");
        }

        // Wildcard routes with ID params — Spring MVC ViewControllers
        // don't support wildcards, so handle these via a controller
        // OR just add the index.html fallback pattern below
    }
}