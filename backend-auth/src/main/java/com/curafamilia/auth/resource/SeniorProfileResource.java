package com.curafamilia.auth.resource;

import com.curafamilia.auth.dto.SeniorProfileDto;
import com.curafamilia.auth.security.AuthContextResolver;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.service.SeniorProfileService;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/senior/profile")
@Consumes(MediaType.APPLICATION_JSON)
public class SeniorProfileResource {
    
    private final SeniorProfileService service = new SeniorProfileService();

    @GET
    @Produces("application/json;charset=UTF-8")
    public Response getProfile(@Context HttpHeaders headers, @QueryParam("seniorId") Long seniorId) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        SeniorProfileDto response = service.getProfile(actor, seniorId);
        return Response.ok(response).build();
    }

    @POST
    @Produces("application/json;charset=UTF-8")
    public Response saveProfile(@Context HttpHeaders headers,
                                @QueryParam("seniorId") Long seniorId,
                                SeniorProfileDto request) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        SeniorProfileDto response = service.saveProfile(actor, seniorId, request);
        return Response.ok(response).build();
    }
}
