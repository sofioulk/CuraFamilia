package com.curafamilia.auth.resource;

import com.curafamilia.auth.dto.AssistantChatRequest;
import com.curafamilia.auth.dto.AssistantConversationResponse;
import com.curafamilia.auth.security.AuthContextResolver;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.service.SeniorAssistantService;
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

@Path("/senior/assistant")
@Consumes(MediaType.APPLICATION_JSON)
public class SeniorAssistantResource {
    private final SeniorAssistantService seniorAssistantService = new SeniorAssistantService();

    @GET
    @Path("/history")
    @Produces("application/json;charset=UTF-8")
    public Response getHistory(@Context HttpHeaders headers,
                               @QueryParam("seniorId") Long seniorId,
                               @QueryParam("date") String date) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        AssistantConversationResponse response = seniorAssistantService.getHistory(actor, seniorId, date);
        return Response.ok(response).build();
    }

    @POST
    @Path("/chat")
    @Produces("application/json;charset=UTF-8")
    public Response chat(@Context HttpHeaders headers, AssistantChatRequest request) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        AssistantConversationResponse response = seniorAssistantService.chat(actor, request);
        return Response.ok(response).build();
    }
}
