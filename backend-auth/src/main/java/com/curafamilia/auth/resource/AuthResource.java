package com.curafamilia.auth.resource;

import com.curafamilia.auth.dto.AuthResponse;
import com.curafamilia.auth.dto.ForgotPasswordRequest;
import com.curafamilia.auth.dto.LoginRequest;
import com.curafamilia.auth.dto.MessageResponse;
import com.curafamilia.auth.dto.RegisterRequest;
import com.curafamilia.auth.service.AuthService;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/auth")
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {
    private final AuthService authService = new AuthService();

    @POST
    @Path("/register")
    @Produces("application/json;charset=UTF-8")
    public Response register(RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return Response.status(Response.Status.CREATED).entity(response).build();
    }

    @POST
    @Path("/login")
    @Produces("application/json;charset=UTF-8")
    public Response login(LoginRequest request) {
        return Response.ok(authService.login(request)).build();
    }

    @POST
    @Path("/forgot-password")
    @Produces("application/json;charset=UTF-8")
    public Response forgotPassword(ForgotPasswordRequest request) {
        MessageResponse response = authService.forgotPassword(request);
        return Response.ok(response).build();
    }
}
