import SwiftUI

struct RecommendationListCard: View {
    let recommendations: [RecommendationItem]
    
    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing12) {
            Text("오늘은 이런 준비가 좋아요")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)

            VStack(spacing: PWSTokens.spacing12) {
                ForEach(recommendations) { item in
                    HStack(spacing: PWSTokens.spacing12) {
                        PWSIconSquare(systemName: item.icon, fill: .white.opacity(0.2), foreground: .white, size: 44)
                        VStack(alignment: .leading, spacing: PWSTokens.spacing4) {
                            Text(item.title)
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(.white)
                            HStack(spacing: PWSTokens.spacing8) {
                                Circle()
                                    .fill(item.dot)
                                    .frame(width: 6, height: 6)
                                Text(item.detail)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(.white.opacity(0.8))
                            }
                        }
                    }
                    .padding(PWSTokens.spacing14)
                    .frame(maxWidth: .infinity, minHeight: 70, alignment: .leading)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                }
            }
        }
        .padding(.vertical, PWSTokens.spacing8)
    }
}

struct RecommendationItem: Identifiable {
    let id = UUID()
    let title: String
    let detail: String
    let icon: String
    let dot: Color
}
