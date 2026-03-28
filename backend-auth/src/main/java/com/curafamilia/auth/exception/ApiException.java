package com.curafamilia.auth.exception;

import jakarta.ws.rs.core.Response;

public class ApiException extends RuntimeException {
    private final Response.Status status;

    public ApiException(Response.Status status, String message) {
        super(message);
        this.status = status;
    }

    public Response.Status getStatus() {
        return status;
    }
}
