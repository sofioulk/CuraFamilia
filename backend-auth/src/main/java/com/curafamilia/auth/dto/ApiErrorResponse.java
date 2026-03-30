package com.curafamilia.auth.dto;

import jakarta.ws.rs.core.Response;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class ApiErrorResponse {
    private int status;
    private String code;
    private String message;
    private String path;
    private String timestamp;

    public ApiErrorResponse() {
    }

    public ApiErrorResponse(int status, String code, String message, String path, String timestamp) {
        this.status = status;
        this.code = code;
        this.message = message;
        this.path = path;
        this.timestamp = timestamp;
    }

    public static ApiErrorResponse of(Response.StatusType status, String message, String path) {
        String normalizedMessage = message;
        if (normalizedMessage == null || normalizedMessage.isBlank()) {
            normalizedMessage = status == null ? "Unexpected server error." : status.getReasonPhrase();
        }

        Response.StatusType resolvedStatus = status == null ? Response.Status.INTERNAL_SERVER_ERROR : status;
        return new ApiErrorResponse(
                resolvedStatus.getStatusCode(),
                toCode(resolvedStatus),
                normalizedMessage,
                path,
                OffsetDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
        );
    }

    private static String toCode(Response.StatusType status) {
        if (status == null) {
            return "internal_server_error";
        }

        return switch (status.getStatusCode()) {
            case 400 -> "bad_request";
            case 401 -> "unauthorized";
            case 403 -> "forbidden";
            case 404 -> "not_found";
            case 409 -> "conflict";
            case 422 -> "unprocessable_entity";
            default -> status.getReasonPhrase().trim().toLowerCase(Locale.ROOT).replace(' ', '_');
        };
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
}
