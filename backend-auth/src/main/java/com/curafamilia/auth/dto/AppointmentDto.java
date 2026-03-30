package com.curafamilia.auth.dto;

public class AppointmentDto {
    private Long id;
    private Long seniorId;
    private String specialty;
    private String appointmentAt;
    private String doctorName;
    private String notes;
    private String status;

    public AppointmentDto() {
    }

    public AppointmentDto(Long id, Long seniorId, String specialty, String appointmentAt,
                          String doctorName, String notes, String status) {
        this.id = id;
        this.seniorId = seniorId;
        this.specialty = specialty;
        this.appointmentAt = appointmentAt;
        this.doctorName = doctorName;
        this.notes = notes;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSeniorId() {
        return seniorId;
    }

    public void setSeniorId(Long seniorId) {
        this.seniorId = seniorId;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }

    public String getAppointmentAt() {
        return appointmentAt;
    }

    public void setAppointmentAt(String appointmentAt) {
        this.appointmentAt = appointmentAt;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public void setDoctorName(String doctorName) {
        this.doctorName = doctorName;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
