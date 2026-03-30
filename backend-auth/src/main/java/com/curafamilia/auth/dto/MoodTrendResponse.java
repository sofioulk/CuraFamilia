package com.curafamilia.auth.dto;

import java.util.List;

public class MoodTrendResponse {
    private Long seniorId;
    private Integer days;
    private List<Day> timeline;

    public MoodTrendResponse() {
    }

    public MoodTrendResponse(Long seniorId, Integer days, List<Day> timeline) {
        this.seniorId = seniorId;
        this.days = days;
        this.timeline = timeline;
    }

    public Long getSeniorId() { return seniorId; }
    public void setSeniorId(Long seniorId) { this.seniorId = seniorId; }
    public Integer getDays() { return days; }
    public void setDays(Integer days) { this.days = days; }
    public List<Day> getTimeline() { return timeline; }
    public void setTimeline(List<Day> timeline) { this.timeline = timeline; }

    public static class Day {
        private String date;
        private Integer checkinsCount;
        private Double moodScore;
        private String moodLabel;
        private String latestAnswer;
        private String summaryText;

        public Day() {
        }

        public Day(String date, Integer checkinsCount, Double moodScore, String moodLabel,
                   String latestAnswer, String summaryText) {
            this.date = date;
            this.checkinsCount = checkinsCount;
            this.moodScore = moodScore;
            this.moodLabel = moodLabel;
            this.latestAnswer = latestAnswer;
            this.summaryText = summaryText;
        }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public Integer getCheckinsCount() { return checkinsCount; }
        public void setCheckinsCount(Integer checkinsCount) { this.checkinsCount = checkinsCount; }
        public Double getMoodScore() { return moodScore; }
        public void setMoodScore(Double moodScore) { this.moodScore = moodScore; }
        public String getMoodLabel() { return moodLabel; }
        public void setMoodLabel(String moodLabel) { this.moodLabel = moodLabel; }
        public String getLatestAnswer() { return latestAnswer; }
        public void setLatestAnswer(String latestAnswer) { this.latestAnswer = latestAnswer; }
        public String getSummaryText() { return summaryText; }
        public void setSummaryText(String summaryText) { this.summaryText = summaryText; }
    }
}
