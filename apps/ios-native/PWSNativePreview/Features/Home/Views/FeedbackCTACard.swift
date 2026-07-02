import SwiftUI

struct FeedbackCTACard: View {
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: PWSTokens.spacing4) {
                    Text("오늘 체감 기록하기")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                    Text("날씨가 어떻게 느껴지셨나요?")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.white.opacity(0.8))
                }
                Spacer()
                Image(systemName: "arrow.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 36, height: 36)
                    .background(.white.opacity(0.2))
                    .clipShape(RoundedRectangle(cornerRadius: PWSTokens.smallRadius, style: .continuous))
            }
            .padding(.horizontal, PWSTokens.spacing16)
            .frame(maxWidth: .infinity, minHeight: 76, alignment: .leading)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
        }
        .buttonStyle(PWSPressableButtonStyle())
    }
}
