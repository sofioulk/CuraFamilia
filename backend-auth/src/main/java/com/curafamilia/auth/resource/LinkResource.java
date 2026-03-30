package com.curafamilia.auth.resource;

import com.curafamilia.auth.dto.LinkGenerateRequest;
import com.curafamilia.auth.dto.LinkGenerateResponse;
import com.curafamilia.auth.dto.LinkedSeniorsResponse;
import com.curafamilia.auth.dto.LinkUseRequest;
import com.curafamilia.auth.dto.LinkUseResponse;
import com.curafamilia.auth.dto.LinkVerifyRequest;
import com.curafamilia.auth.dto.LinkVerifyResponse;
import com.curafamilia.auth.security.AuthContextResolver;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.service.LinkService;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/links")
@Consumes(MediaType.APPLICATION_JSON)
@Produces("application/json;charset=UTF-8")
public class LinkResource {
    private final LinkService linkService = new LinkService();

    @POST
    @Path("/generate")
    public Response generate(@Context HttpHeaders headers, LinkGenerateRequest request) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        LinkGenerateResponse response = linkService.generateCode(actor, request);
        return Response.status(Response.Status.CREATED).entity(response).build();
    }

    @POST
    @Path("/verify")
    public Response verify(@Context HttpHeaders headers, LinkVerifyRequest request) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        LinkVerifyResponse response = linkService.verifyCode(actor, request);
        return Response.ok(response).build();
    }

    @POST
    @Path("/use")
    public Response use(@Context HttpHeaders headers, LinkUseRequest request) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        LinkUseResponse response = linkService.useCode(actor, request);
        return Response.ok(response).build();
    }

    @GET
    @Path("/my-seniors")
    public Response mySeniors(@Context HttpHeaders headers) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        LinkedSeniorsResponse response = linkService.getMySeniors(actor);
        return Response.ok(response).build();
    }

    @DELETE
    @Path("/{seniorId}")
    public Response unlink(@Context HttpHeaders headers, @PathParam("seniorId") Long seniorId) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        LinkUseResponse response = linkService.unlink(actor, seniorId);
        return Response.ok(response).build();
    }
}
