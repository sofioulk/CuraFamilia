package com.curafamilia.auth.dto;

import java.util.List;

public class HomeResponse {
    private SeniorInfo senior;
    private DateInfo date;
    private NextMedication nextMedication;
    private DailyQuestion dailyQuestion;
    private List<DailyQuestion> dailyQuestions;
    private List<MedicationItem> medications;
    private AppointmentInfo nextAppointment;
    private SosAlertInfo latestSosAlert;

    public HomeResponse() {
    }

    public HomeResponse(SeniorInfo senior, DateInfo date, NextMedication nextMedication, DailyQuestion dailyQuestion,
                        List<MedicationItem> medications, AppointmentInfo nextAppointment, SosAlertInfo latestSosAlert) {
        this(senior, date, nextMedication, dailyQuestion,
                dailyQuestion == null ? List.of() : List.of(dailyQuestion),
                medications, nextAppointment, latestSosAlert);
    }

    public HomeResponse(SeniorInfo senior, DateInfo date, NextMedication nextMedication, DailyQuestion dailyQuestion,
                        List<DailyQuestion> dailyQuestions, List<MedicationItem> medications,
                        AppointmentInfo nextAppointment, SosAlertInfo latestSosAlert) {
        this.senior = senior;
        this.date = date;
        this.nextMedication = nextMedication;
        this.dailyQuestion = dailyQuestion;
        this.dailyQuestions = dailyQuestions == null ? List.of() : dailyQuestions;
        this.medications = medications;
        this.nextAppointment = nextAppointment;
        this.latestSosAlert = latestSosAlert;
    }

    public SeniorInfo getSenior() {
        return senior;
    }

    public void setSenior(SeniorInfo senior) {
        this.senior = senior;
    }

    public DateInfo getDate() {
        return date;
    }

    public void setDate(DateInfo date) {
        this.date = date;
    }

    public NextMedication getNextMedication() {
        return nextMedication;
    }

    public void setNextMedication(NextMedication nextMedication) {
        this.nextMedication = nextMedication;
    }

    public DailyQuestion getDailyQuestion() {
        return dailyQuestion;
    }

    public void setDailyQuestion(DailyQuestion dailyQuestion) {
        this.dailyQuestion = dailyQuestion;
    }

    public List<DailyQuestion> getDailyQuestions() {
        return dailyQuestions;
    }

    public void setDailyQuestions(List<DailyQuestion> dailyQuestions) {
        this.dailyQuestions = dailyQuestions;
    }

    public List<MedicationItem> getMedications() {
        return medications;
    }

    public void setMedications(List<MedicationItem> medications) {
        this.medications = medications;
    }

    public AppointmentInfo getNextAppointment() {
        return nextAppointment;
    }

    public void setNextAppointment(AppointmentInfo nextAppointment) {
        this.nextAppointment = nextAppointment;
    }

    public SosAlertInfo getLatestSosAlert() {
        return latestSosAlert;
    }

    public void setLatestSosAlert(SosAlertInfo latestSosAlert) {
        this.latestSosAlert = latestSosAlert;
    }

    public static class SeniorInfo {
        private Long id;
        private String name;

        public SeniorInfo() {
        }

        public SeniorInfo(Long id, String name) {
            this.id = id;
            this.name = name;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }

    public static class DateInfo {
        private String iso;
        private String label;

        public DateInfo() {
        }

        public DateInfo(String iso, String label) {
            this.iso = iso;
            this.label = label;
        }

        public String getIso() {
            return iso;
        }

        public void setIso(String iso) {
            this.iso = iso;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }
    }

    public static class NextMedication {
        private Long medicationId;
        private String name;
        private String dosage;
        private String time;
        private String scheduledAt;
        private String status;
        private Integer countdownMinutes;
        private String countdownText;

        public NextMedication() {
        }

        public NextMedication(Long medicationId, String name, String dosage, String time, String scheduledAt,
                              String status, Integer countdownMinutes, String countdownText) {
            this.medicationId = medicationId;
            this.name = name;
            this.dosage = dosage;
            this.time = time;
            this.scheduledAt = scheduledAt;
            this.status = status;
            this.countdownMinutes = countdownMinutes;
            this.countdownText = countdownText;
        }

        public Long getMedicationId() {
            return medicationId;
        }

        public void setMedicationId(Long medicationId) {
            this.medicationId = medicationId;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getDosage() {
            return dosage;
        }

        public void setDosage(String dosage) {
            this.dosage = dosage;
        }

        public String getTime() {
            return time;
        }

        public void setTime(String time) {
            this.time = time;
        }

        public String getScheduledAt() {
            return scheduledAt;
        }

        public void setScheduledAt(String scheduledAt) {
            this.scheduledAt = scheduledAt;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public Integer getCountdownMinutes() {
            return countdownMinutes;
        }

        public void setCountdownMinutes(Integer countdownMinutes) {
            this.countdownMinutes = countdownMinutes;
        }

        public String getCountdownText() {
            return countdownText;
        }

        public void setCountdownText(String countdownText) {
            this.countdownText = countdownText;
        }
    }

    public static class DailyQuestion {
        private String question;
        private List<String> options;
        private String latestAnswer;
        private String latestAnsweredAt;

        public DailyQuestion() {
        }

        public DailyQuestion(String question, List<String> options, String latestAnswer, String latestAnsweredAt) {
            this.question = question;
            this.options = options;
            this.latestAnswer = latestAnswer;
            this.latestAnsweredAt = latestAnsweredAt;
        }

        public String getQuestion() {
            return question;
        }

        public void setQuestion(String question) {
            this.question = question;
        }

        public List<String> getOptions() {
            return options;
        }

        public void setOptions(List<String> options) {
            this.options = options;
        }

        public String getLatestAnswer() {
            return latestAnswer;
        }

        public void setLatestAnswer(String latestAnswer) {
            this.latestAnswer = latestAnswer;
        }

        public String getLatestAnsweredAt() {
            return latestAnsweredAt;
        }

        public void setLatestAnsweredAt(String latestAnsweredAt) {
            this.latestAnsweredAt = latestAnsweredAt;
        }
    }

    public static class MedicationItem {
        private Long id;
        private String name;
        private String dosage;
        private String time;
        private String frequency;
        private String period;
        private String instruction;
        private String status;
        private String scheduledAt;
        private String takenAt;

        public MedicationItem() {
        }

        public MedicationItem(Long id, String name, String dosage, String time, String frequency, String period,
                              String instruction, String status, String scheduledAt, String takenAt) {
            this.id = id;
            this.name = name;
            this.dosage = dosage;
            this.time = time;
            this.frequency = frequency;
            this.period = period;
            this.instruction = instruction;
            this.status = status;
            this.scheduledAt = scheduledAt;
            this.takenAt = takenAt;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getDosage() {
            return dosage;
        }

        public void setDosage(String dosage) {
            this.dosage = dosage;
        }

        public String getTime() {
            return time;
        }

        public void setTime(String time) {
            this.time = time;
        }

        public String getFrequency() {
            return frequency;
        }

        public void setFrequency(String frequency) {
            this.frequency = frequency;
        }

        public String getPeriod() {
            return period;
        }

        public void setPeriod(String period) {
            this.period = period;
        }

        public String getInstruction() {
            return instruction;
        }

        public void setInstruction(String instruction) {
            this.instruction = instruction;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getScheduledAt() {
            return scheduledAt;
        }

        public void setScheduledAt(String scheduledAt) {
            this.scheduledAt = scheduledAt;
        }

        public String getTakenAt() {
            return takenAt;
        }

        public void setTakenAt(String takenAt) {
            this.takenAt = takenAt;
        }
    }

    public static class AppointmentInfo {
        private Long id;
        private String specialty;
        private String appointmentAt;
        private String doctorName;
        private String notes;
        private String status;

        public AppointmentInfo() {
        }

        public AppointmentInfo(Long id, String specialty, String appointmentAt, String doctorName, String notes, String status) {
            this.id = id;
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

    public static class SosAlertInfo {
        private Long id;
        private String status;
        private String triggeredAt;
        private String comment;

        public SosAlertInfo() {
        }

        public SosAlertInfo(Long id, String status, String triggeredAt, String comment) {
            this.id = id;
            this.status = status;
            this.triggeredAt = triggeredAt;
            this.comment = comment;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getTriggeredAt() {
            return triggeredAt;
        }

        public void setTriggeredAt(String triggeredAt) {
            this.triggeredAt = triggeredAt;
        }

        public String getComment() {
            return comment;
        }

        public void setComment(String comment) {
            this.comment = comment;
        }
    }
}
