import SwiftUI

struct HomeScreen: View {
    let environment: AppEnvironment
    let session: PWSSession
    let weatherState: WeatherRepositoryState
    let feedbackState: FeedbackRepositoryState
    let predictionResult: PredictionResult?
    var onNavigateToFeedback: (() -> Void)?

    @State private var selectedHour: Double = Double(Calendar.current.component(.hour, from: Date()))

    private let recommendations = [
        RecommendationItem(title: "선크림을 바르는 것이 좋아요", detail: "자외선 지수 8 · 매우 높음", icon: "sun.max", dot: Color(red: 0.88, green: 0.44, blue: 0.00)),
        RecommendationItem(title: "미세먼지 높음 · 마스크 권장", detail: "PM2.5 76㎍/㎥", icon: "wind", dot: Color(red: 0.27, green: 0.33, blue: 0.42)),
        RecommendationItem(title: "양산 챙기면 좋아요", detail: "자외선 차단에 효과적", icon: "umbrella", dot: Color(red: 0.50, green: 0.13, blue: 1.00)),
        RecommendationItem(title: "오후 2~4시 환기 추천", detail: "미세먼지 농도가 낮아집니다", icon: "humidity", dot: Color(red: 0.00, green: 0.60, blue: 0.40))
    ]

    var body: some View {
        NavigationStack {
            WeatherSceneView(
                weatherState: weatherState,
                feedbackState: feedbackState,
                predictionResult: predictionResult,
                selectedHour: $selectedHour
            ) {
                OutfitGuideCard(tempC: weatherState.data?.current.temp ?? 20)
                
                FeedbackCTACard(action: {
                    onNavigateToFeedback?()
                })
                
                RecommendationListCard(recommendations: recommendations)

                NavigationLink {
                    WeatherDetailScreen()
                } label: {
                    PWSGradientActionCard(
                        title: "다른 지역 날씨",
                        subtitle: "다른 지역 날씨와 옷차림 확인하기",
                        systemImage: "mappin.circle"
                    )
                }
                .buttonStyle(.plain)
                .accessibilityLabel("다른 지역 날씨")
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
        }
    }
}
