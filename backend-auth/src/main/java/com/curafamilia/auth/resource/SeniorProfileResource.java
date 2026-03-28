package com.curafamilia.auth.resource;

import com.curafamilia.auth.dto.SeniorProfileDto;
import com.curafamilia.auth.service.SeniorProfileService;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/senior/profile")
@Consumes(MediaType.APPLICATION_JSON)
public class SeniorProfileResource {
    
    private final SeniorProfileService service = new SeniorProfileService();

    @GET
    @Produces("application/json;charset=UTF-8")
    public Response getProfile(@QueryParam("seniorId") Long seniorId) {
        SeniorProfileDto response = service.getProfile(seniorId);
        return Response.ok(response).build();
    }

    @POST
    @Produces("application/json;charset=UTF-8")
    public Response saveProfile(@QueryParam("seniorId") Long seniorId, SeniorProfileDto request) {
        SeniorProfileDto response = service.saveProfile(seniorId, request);
        return Response.ok(response).build();
    }
}
