package com.curafamilia.auth;

import com.curafamilia.auth.dto.AppointmentCrudResponse;
import com.curafamilia.auth.dto.AppointmentWriteRequest;
import com.curafamilia.auth.dto.LinkGenerateRequest;
import com.curafamilia.auth.dto.LinkGenerateResponse;
import com.curafamilia.auth.dto.LinkUseRequest;
import com.curafamilia.auth.dto.LinkUseResponse;
import com.curafamilia.auth.dto.LinkVerifyRequest;
import com.curafamilia.auth.dto.LinkVerifyResponse;
import com.curafamilia.auth.dto.MedicationCrudResponse;
import com.curafamilia.auth.dto.MedicationTakeRequest;
import com.curafamilia.auth.dto.MedicationWriteRequest;
import com.curafamilia.auth.dto.SosAlertHistoryResponse;
import com.curafamilia.auth.dto.SosAlertRequest;
import com.curafamilia.auth.exception.ApiException;
import com.curafamilia.auth.realtime.RealtimeEvent;
import com.curafamilia.auth.realtime.RealtimeEventBus;
import com.curafamilia.auth.realtime.RealtimeEventListener;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.service.AppointmentCrudService;
import com.curafamilia.auth.service.LinkService;
import com.curafamilia.auth.service.MedicationCrudService;
import com.curafamilia.auth.service.SeniorApiService;
import com.curafamilia.auth.service.SeniorHomeService;
import com.curafamilia.auth.service.SosManagementService;
import com.curafamilia.auth.support.IntegrationTestSupport;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class BackendIntegrationTest {
    private final CapturingRealtimeListener listener = new CapturingRealtimeListener();

    private long seniorId;
    private long linkedFamilyId;
    private long unlinkedFamilyId;

    @BeforeEach
    void setUp() throws Exception {
        IntegrationTestSupport.resetDatabase();
        RealtimeEventBus.addListener(listener);

        seniorId = IntegrationTestSupport.insertUser("Senior One", "senior@example.com", "senior");
        linkedFamilyId = IntegrationTestSupport.insertUser("Linked Family", "linked@example.com", "famille");
        unlinkedFamilyId = IntegrationTestSupport.insertUser("Unlinked Family", "unlinked@example.com", "famille");
        IntegrationTestSupport.linkFamily(linkedFamilyId, seniorId);
    }

    @AfterEach
    void tearDown() {
        RealtimeEventBus.removeListener(listener);
        listener.events.clear();
    }

    @Test
    void accessMatrix_appliesJwtIdentityAndLinkRules() throws Exception {
        IntegrationTestSupport.insertMedication(seniorId, "Paracetamol", "500mg", LocalTime.of(8, 0));

        SeniorHomeService homeService = new SeniorHomeService();
        AuthenticatedUser seniorActor = seniorActor();
        AuthenticatedUser linkedFamilyActor = linkedFamilyActor();
        AuthenticatedUser unlinkedFamilyActor = unlinkedFamilyActor();

        var homeForSenior = homeService.getHome(seniorActor, seniorId + 999L, LocalDate.now().toString());
        assertEquals(seniorId, homeForSenior.getSenior().getId());

        var homeForLinkedFamily = homeService.getHome(linkedFamilyActor, seniorId, LocalDate.now().toString());
        assertEquals(seniorId, homeForLinkedFamily.getSenior().getId());

        ApiException forbidden = assertThrows(ApiException.class,
                () -> homeService.getHome(unlinkedFamilyActor, seniorId, LocalDate.now().toString()));
        assertEquals(403, forbidden.getStatus().getStatusCode());

        var profile = new SeniorApiService().getSeniorProfile(seniorActor, seniorId + 123L);
        assertEquals(seniorId, profile.getSeniorId());
    }

    @Test
    void linkCodesExpireAndCanBeUsedOnlyOnce() throws Exception {
        LinkService linkService = new LinkService();
        AuthenticatedUser seniorActor = seniorActor();
        AuthenticatedUser linkedFamilyActor = linkedFamilyActor();
        AuthenticatedUser secondFamilyActor = new AuthenticatedUser(unlinkedFamilyId, "famille", "unlinked@example.com");

        LinkGenerateRequest generateRequest = new LinkGenerateRequest();
        generateRequest.setExpiresInDays(1);
        LinkGenerateResponse generated = linkService.generateCode(seniorActor, generateRequest);
        assertNotNull(generated.getCode());

        LinkVerifyRequest verifyRequest = new LinkVerifyRequest();
        verifyRequest.setCode(generated.getCode());
        LinkVerifyResponse verified = linkService.verifyCode(linkedFamilyActor, verifyRequest);
        assertTrue(verified.isValid());

        LinkUseRequest useRequest = new LinkUseRequest();
        useRequest.setCode(generated.getCode());
        LinkUseResponse linked = linkService.useCode(linkedFamilyActor, useRequest);
        assertEquals(seniorId, linked.getSenior().getSeniorId());

        ApiException secondUse = assertThrows(ApiException.class, () -> linkService.useCode(secondFamilyActor, useRequest));
        assertEquals(404, secondUse.getStatus().getStatusCode());

        LinkGenerateResponse expiringCode = linkService.generateCode(seniorActor, generateRequest);
        IntegrationTestSupport.expireInvitation(expiringCode.getCode());

        LinkVerifyRequest expiredVerifyRequest = new LinkVerifyRequest();
        expiredVerifyRequest.setCode(expiringCode.getCode());
        LinkVerifyResponse expiredVerification = linkService.verifyCode(secondFamilyActor, expiredVerifyRequest);
        assertFalse(expiredVerification.isValid());
    }

    @Test
    void medicationCrudAndTakenFlowEmitRealtimeEvents() throws Exception {
        MedicationCrudService medicationCrudService = new MedicationCrudService();
        SeniorHomeService seniorHomeService = new SeniorHomeService();

        MedicationWriteRequest createRequest = new MedicationWriteRequest();
        createRequest.setSeniorId(seniorId);
        createRequest.setName("Lisinopril");
        createRequest.setDosage("10mg");
        createRequest.setTime("09:00");
        createRequest.setFrequency("Tous les jours");
        createRequest.setPeriod("matin");

        MedicationCrudResponse created = medicationCrudService.createMedication(linkedFamilyActor(), createRequest);
        assertEquals("medication:added", listener.lastEventName());

        MedicationWriteRequest updateRequest = new MedicationWriteRequest();
        updateRequest.setDosage("20mg");
        MedicationCrudResponse updated = medicationCrudService.updateMedication(
                linkedFamilyActor(),
                created.getMedication().getId(),
                updateRequest
        );
        assertEquals("medication:updated", listener.lastEventName());
        assertEquals("20mg", updated.getMedication().getDosage());

        MedicationTakeRequest takeRequest = new MedicationTakeRequest();
        seniorHomeService.markMedicationTaken(seniorActor(), created.getMedication().getId(), takeRequest);
        assertEquals("medication:taken", listener.lastEventName());

        MedicationCrudResponse deleted = medicationCrudService.deleteMedication(linkedFamilyActor(), created.getMedication().getId());
        assertEquals("medication:deleted", listener.lastEventName());
        assertFalse(deleted.getMedication().getActive());
    }

    @Test
    void appointmentCrudEmitsRealtimeEvents() {
        AppointmentCrudService appointmentCrudService = new AppointmentCrudService();

        AppointmentWriteRequest createRequest = new AppointmentWriteRequest();
        createRequest.setSeniorId(seniorId);
        createRequest.setSpecialty("Cardiologie");
        createRequest.setAppointmentAt("2026-04-05T10:30:00");
        createRequest.setDoctorName("Dr Test");

        AppointmentCrudResponse created = appointmentCrudService.createAppointment(linkedFamilyActor(), createRequest);
        assertEquals("appointment:created", listener.lastEventName());

        AppointmentWriteRequest updateRequest = new AppointmentWriteRequest();
        updateRequest.setStatus("done");
        AppointmentCrudResponse updated = appointmentCrudService.updateAppointment(
                linkedFamilyActor(),
                created.getAppointment().getId(),
                updateRequest
        );
        assertEquals("appointment:updated", listener.lastEventName());
        assertEquals("done", updated.getAppointment().getStatus());

        appointmentCrudService.deleteAppointment(linkedFamilyActor(), created.getAppointment().getId());
        assertEquals("appointment:deleted", listener.lastEventName());
    }

    @Test
    void sosAckResolveHistoryFlowEmitsRealtimeEvents() throws Exception {
        SeniorHomeService seniorHomeService = new SeniorHomeService();
        SosManagementService sosManagementService = new SosManagementService();

        SosAlertRequest request = new SosAlertRequest();
        request.setComment("Chest pain");
        var triggered = seniorHomeService.triggerSos(seniorActor(), request);
        assertEquals("sos:triggered", listener.lastEventName());

        var acknowledged = sosManagementService.acknowledge(linkedFamilyActor(), triggered.getAlert().getId());
        assertEquals("sos:acknowledged", listener.lastEventName());
        assertEquals("acknowledged", acknowledged.getAlert().getStatus());

        var resolved = sosManagementService.resolve(linkedFamilyActor(), triggered.getAlert().getId());
        assertEquals("sos:resolved", listener.lastEventName());
        assertEquals("resolved", resolved.getAlert().getStatus());

        SosAlertHistoryResponse history = sosManagementService.getHistory(linkedFamilyActor(), seniorId, 20);
        assertEquals(1, history.getCount());
        assertEquals("resolved", history.getAlerts().getFirst().getStatus());
    }

    private AuthenticatedUser seniorActor() {
        return new AuthenticatedUser(seniorId, "senior", "senior@example.com");
    }

    private AuthenticatedUser linkedFamilyActor() {
        return new AuthenticatedUser(linkedFamilyId, "famille", "linked@example.com");
    }

    private AuthenticatedUser unlinkedFamilyActor() {
        return new AuthenticatedUser(unlinkedFamilyId, "famille", "unlinked@example.com");
    }

    private static class CapturingRealtimeListener implements RealtimeEventListener {
        private final List<RealtimeEvent> events = new ArrayList<>();

        @Override
        public void onEvent(RealtimeEvent event) {
            events.add(event);
        }

        private String lastEventName() {
            return events.isEmpty() ? null : events.getLast().getEvent();
        }
    }
}
