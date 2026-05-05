package com.wxxtae.pws.nativepreview.domain

data class HistoryMetricNative(
    val label: String,
    val value: String,
)

data class HistorySummaryNative(
    val metrics: List<HistoryMetricNative>,
    val trendMessage: String,
)

object HistorySummaryFactory {
    fun from(feedbackState: FeedbackRepositoryState): HistorySummaryNative {
        val total = feedbackState.feedbackCount
        val morning = feedbackState.feedbackCountBySlot[FeedbackSlot.Morning] ?: 0
        val afternoon = feedbackState.feedbackCountBySlot[FeedbackSlot.Afternoon] ?: 0
        val evening = feedbackState.feedbackCountBySlot[FeedbackSlot.Evening] ?: 0
        val dominantSlot = listOf(
            FeedbackSlot.Morning to morning,
            FeedbackSlot.Afternoon to afternoon,
            FeedbackSlot.Evening to evening,
        ).maxBy { it.second }

        return HistorySummaryNative(
            metrics = listOf(
                HistoryMetricNative("누적 기록", "${total}개"),
                HistoryMetricNative("아침", "${morning}개"),
                HistoryMetricNative("낮", "${afternoon}개"),
                HistoryMetricNative("저녁", "${evening}개"),
            ),
            trendMessage = if (total == 0) {
                "아직 기록이 없어요. 첫 체감 기록을 남기면 추세가 표시됩니다."
            } else {
                "${dominantSlot.first.label} 시간대 기록이 가장 많아요. 총 ${total}개의 체감 기록을 네이티브 저장소에서 불러왔습니다."
            },
        )
    }
}
