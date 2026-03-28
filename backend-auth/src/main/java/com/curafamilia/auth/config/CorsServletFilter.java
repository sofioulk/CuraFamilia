package com.curafamilia.auth.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.util.Locale;

public class CorsServletFilter implements Filter {
    private static final String UTF_8 = "UTF-8";
    private static final String HTTP = "http";
    private static final String HTTPS = "https";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        request.setCharacterEncoding(UTF_8);
        response.setCharacterEncoding(UTF_8);

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String origin = httpRequest.getHeader("Origin");
        if (isAllowedOrigin(origin)) {
            httpResponse.setHeader("Access-Control-Allow-Origin", origin);
            httpResponse.setHeader("Vary", "Origin");
        }

        httpResponse.setHeader("Access-Control-Allow-Headers", "origin, content-type, accept, authorization");
        httpResponse.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
        httpResponse.setHeader("Access-Control-Allow-Credentials", "true");

        if ("OPTIONS".equalsIgnoreCase(httpRequest.getMethod())) {
            httpResponse.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        chain.doFilter(request, response);
    }

    private boolean isAllowedOrigin(String origin) {
        if (origin == null || origin.isBlank()) {
            return false;
        }

        try {
            URI uri = URI.create(origin);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null || host.isBlank()) {
                return false;
            }

            String normalizedScheme = scheme.toLowerCase(Locale.ROOT);
            if (!HTTP.equals(normalizedScheme) && !HTTPS.equals(normalizedScheme)) {
                return false;
            }

            String normalizedHost = host.toLowerCase(Locale.ROOT);
            return isLoopbackHost(normalizedHost)
                    || isPrivateIpv4Address(normalizedHost)
                    || normalizedHost.endsWith(".local")
                    || isSingleLabelHost(normalizedHost);
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private boolean isLoopbackHost(String host) {
        return "localhost".equals(host)
                || "127.0.0.1".equals(host)
                || "::1".equals(host)
                || "[::1]".equals(host);
    }

    private boolean isSingleLabelHost(String host) {
        return !host.contains(".") && !host.contains(":");
    }

    private boolean isPrivateIpv4Address(String host) {
        String[] parts = host.split("\\.");
        if (parts.length != 4) {
            return false;
        }

        int[] octets = new int[4];
        for (int index = 0; index < parts.length; index += 1) {
            String part = parts[index];
            if (part.isEmpty() || part.length() > 3) {
                return false;
            }
            int value;
            try {
                value = Integer.parseInt(part);
            } catch (NumberFormatException ex) {
                return false;
            }
            if (value < 0 || value > 255) {
                return false;
            }
            octets[index] = value;
        }

        if (octets[0] == 10) {
            return true;
        }

        if (octets[0] == 192 && octets[1] == 168) {
            return true;
        }

        return octets[0] == 172 && octets[1] >= 16 && octets[1] <= 31;
    }
}
