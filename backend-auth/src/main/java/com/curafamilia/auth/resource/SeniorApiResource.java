package com.curafamilia.auth.resource;

import com.curafamilia.auth.dto.SeniorProfileApiResponse;
import com.curafamilia.auth.dto.SeniorProfileUpdateRequest;
import com.curafamilia.auth.security.AuthContextResolver;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.service.SeniorApiService;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/senior")
@Consumes(MediaType.APPLICATION_JSON)
@Produces("application/json;charset=UTF-8")
public class SeniorApiResource {
    private final SeniorApiService seniorApiService = new SeniorApiService();

    @GET
    @Path("/{seniorId}")
    public Response getSenior(@Context HttpHeaders headers, @PathParam("seniorId") Long seniorId) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        SeniorProfileApiResponse response = seniorApiService.getSeniorProfile(actor, seniorId);
        return Response.ok(response).build();
    }

    @PUT
    @Path("/{seniorId}/profile")
    public Response updateSeniorProfile(@Context HttpHeaders headers,
                                        @PathParam("seniorId") Long seniorId,
                                        SeniorProfileUpdateRequest request) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        SeniorProfileApiResponse response = seniorApiService.updateSeniorProfile(actor, seniorId, request);
        return Response.ok(response).build();
    }
}
