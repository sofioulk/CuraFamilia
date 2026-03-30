package com.curafamilia.auth.dto;

public class MedicationCrudResponse {
    private String message;
    private MedicationDto medication;

    public MedicationCrudResponse() {
    }

    public MedicationCrudResponse(String message, MedicationDto medication) {
        this.message = message;
        this.medication = medication;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public MedicationDto getMedication() {
        return medication;
    }

    public void setMedication(MedicationDto medication) {
        this.medication = medication;
    }
}
