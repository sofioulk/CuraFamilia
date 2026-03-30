package com.curafamilia.auth.dto;

import java.util.List;

public class AdherenceTrendResponse {
    private Long seniorId;
    private Integer days;
    private Summary summary;
    private List<Day> timeline;

    public AdherenceTrendResponse() {
    }

    public AdherenceTrendResponse(Long seniorId, Integer days, Summary summary, List<Day> timeline) {
        this.seniorId = seniorId;
        this.days = days;
        this.summary = summary;
        this.timeline = timeline;
    }

    public Long getSeniorId() { return seniorId; }
    public void setSeniorId(Long seniorId) { this.seniorId = seniorId; }
    public Integer getDays() { return days; }
    public void setDays(Integer days) { this.days = days; }
    public Summary getSummary() { return summary; }
    public void setSummary(Summary summary) { this.summary = summary; }
    public List<Day> getTimeline() { return timeline; }
    public void setTimeline(List<Day> timeline) { this.timeline = timeline; }

    public static class Summary {
        private Integer scheduledCount;
        private Integer takenCount;
        private Double percentage;

        public Summary() {
        }

        public Summary(Integer scheduledCount, Integer takenCount, Double percentage) {
            this.scheduledCount = scheduledCount;
            this.takenCount = takenCount;
            this.percentage = percentage;
        }

        public Integer getScheduledCount() { return scheduledCount; }
        public void setScheduledCount(Integer scheduledCount) { this.scheduledCount = scheduledCount; }
        public Integer getTakenCount() { return takenCount; }
        public void setTakenCount(Integer takenCount) { this.takenCount = takenCount; }
        public Double getPercentage() { return percentage; }
        public void setPercentage(Double percentage) { this.percentage = percentage; }
    }

    public static class Day {
        private String date;
        private Integer scheduledCount;
        private Integer takenCount;
        private Double percentage;

        public Day() {
        }

        public Day(String date, Integer scheduledCount, Integer takenCount, Double percentage) {
            this.date = date;
            this.scheduledCount = scheduledCount;
            this.takenCount = takenCount;
            this.percentage = percentage;
        }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public Integer getScheduledCount() { return scheduledCount; }
        public void setScheduledCount(Integer scheduledCount) { this.scheduledCount = scheduledCount; }
        public Integer getTakenCount() { return takenCount; }
        public void setTakenCount(Integer takenCount) { this.takenCount = takenCount; }
        public Double getPercentage() { return percentage; }
        public void setPercentage(Double percentage) { this.percentage = percentage; }
    }
}
