import SwiftUI

struct FeedbackScreen: View {
    let session: PWSSession
    let feedbackState: FeedbackRepositoryState
    let onSaveFeedback: (FeedbackInputNative) async throws -> FeedbackRepositoryState
    @State private var selectedSlot = "낮"
    @State private var selectedTemperatureFeel = "적당함"
    @State private var selectedHumidityFeel = "쾌적함"
    @State private var selectedWindFeel = "약한 바람"
    @State private var selectedTop = "반팔티, 반팔 블라우스&셔츠"
    @State private var selectedOuter = "가디건"
    @State private var selectedBottom = "청바지"
    @State private var expandedOutfitRow: String?
    @State private var didSubmit = false
    @State private var savedFeedbackState = FeedbackRepositoryState()
    @State private var isSaving = false
    @State private var saveErrorMessage: String?

    private let slots = [
        FeedbackSlotCard(title: "아침", time: "06-10시", systemImage: "sunrise"),
        FeedbackSlotCard(title: "낮", time: "10-18시", systemImage: "sun.max"),
        FeedbackSlotCard(title: "저녁", time: "18-22시", systemImage: "moon")
    ]

    var body: some View {
        PWSStrictScreen {
            PWSAppHeader("오늘 체감 기록", subtitle: "날씨가 어떻게 느껴지셨나요?")

            PWSStrictSection(title: "시간대 선택") {
                HStack(spacing: PWSTokens.spacing12) {
                    ForEach(slots) { slot in
                        Button {
                            selectedSlot = slot.title
                        } label: {
                            TimeSlotTile(slot: slot, selected: selectedSlot == slot.title)
                        }
                        .buttonStyle(PWSPressableButtonStyle())
                    }
                }
            }

            PWSStrictSection(title: "오늘 옷차림", background: PWSTokens.warmPanelBackground) {
                PWSStrictCard(radius: PWSTokens.radius, shadow: false) {
                    OutfitAccordionRow(
                        title: "상의",
                        value: $selectedTop,
                        expanded: expandedOutfitRow == "상의",
                        options: ["반팔티, 반팔 블라우스&셔츠", "긴팔티", "셔츠", "니트"],
                        onToggle: { toggleOutfitRow("상의") }
                    )
                    OutfitAccordionRow(
                        title: "아우터",
                        value: $selectedOuter,
                        expanded: expandedOutfitRow == "아우터",
                        options: ["없음", "가디건", "자켓", "코트"],
                        onToggle: { toggleOutfitRow("아우터") }
                    )
                    OutfitAccordionRow(
                        title: "하의",
                        value: $selectedBottom,
                        expanded: expandedOutfitRow == "하의",
                        options: ["반바지", "청바지", "슬랙스", "긴바지"],
                        onToggle: { toggleOutfitRow("하의") }
                    )
                }
            }

            PWSStrictSection(title: "체감 피드백") {
                FeelChipCard(title: "기온 체감", chips: ["매우 추움", "추움", "선선함", "적당함", "따뜻함", "더움", "매우 더움"], selected: $selectedTemperatureFeel)
                FeelChipCard(title: "습도 체감", chips: ["건조함", "쾌적함", "습함", "매우 습함"], selected: $selectedHumidityFeel)
                FeelChipCard(title: "바람 체감", chips: ["바람 없음", "약한 바람", "보통 바람", "강한 바람"], selected: $selectedWindFeel)
            }

            if didSubmit {
                PWSStatusBanner(
                    title: "\(selectedSlot) 기록 저장 완료",
                    message: "\(session.displayName)님의 \(savedFeedbackState.feedbackCount)번째 체감 데이터가 다음 추천에 반영됩니다.",
                    kind: .success
                )
                .padding(.horizontal, PWSTokens.spacing24)
            }

            if let saveErrorMessage {
                PWSStatusBanner(
                    title: "저장 실패",
                    message: saveErrorMessage,
                    kind: .warning
                )
                .padding(.horizontal, PWSTokens.spacing24)
            }

            Button {
                isSaving = true
                saveErrorMessage = nil
                Task {
                    do {
                        let state = try await onSaveFeedback(currentFeedbackInput)
                        await MainActor.run {
                            savedFeedbackState = state
                            didSubmit = true
                            isSaving = false
                        }
                    } catch {
                        await MainActor.run {
                            didSubmit = false
                            isSaving = false
                            saveErrorMessage = "체감 기록을 저장하지 못했습니다. 로그인과 네트워크 상태를 확인해주세요."
                        }
                    }
                }
            } label: {
                HStack(spacing: PWSTokens.spacing12) {
                    Text(isSaving ? "저장 중" : "기록 저장하기")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(PWSTokens.primaryText)
                        .lineLimit(1)
                        .minimumScaleFactor(0.82)
                        .allowsTightening(true)
                    Spacer()
                    Image(systemName: "arrow.right")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(PWSTokens.primaryText)
                        .frame(width: 36, height: 36)
                        .background(PWSTokens.secondaryPanelBackground)
                        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.smallRadius, style: .continuous))
                }
                .padding(.horizontal, PWSTokens.spacing20)
                .frame(maxWidth: .infinity, minHeight: 76)
                .background(PWSTokens.panelBackground)
                .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous)
                        .stroke(PWSTokens.border, lineWidth: 1)
                }
                .shadow(color: .black.opacity(0.12), radius: 14, x: 0, y: 6)
            }
            .buttonStyle(PWSPressableButtonStyle())
            .disabled(isSaving || feedbackState.isSaving)
            .padding(.horizontal, PWSTokens.spacing24)
            .padding(.top, PWSTokens.spacing8)
        }
    }

    private func toggleOutfitRow(_ row: String) {
        withAnimation(.snappy(duration: 0.18)) {
            expandedOutfitRow = expandedOutfitRow == row ? nil : row
        }
    }

    private var currentFeedbackInput: FeedbackInputNative {
        FeedbackInputNative(
            feelScore: temperatureFeelScore(selectedTemperatureFeel),
            humidFeel: humidityFeelScore(selectedHumidityFeel),
            windFeel: windFeelScore(selectedWindFeel),
            clothing: clothingScore(selectedOuter),
            clothingItems: outfitItems(top: selectedTop, outer: selectedOuter, bottom: selectedBottom),
            activity: 2,
            slot: feedbackSlot(selectedSlot)
        )
    }
}

private struct FeedbackSlotCard: Identifiable {
    let id = UUID()
    let title: String
    let time: String
    let systemImage: String
}

private struct TimeSlotTile: View {
    let slot: FeedbackSlotCard
    let selected: Bool

    var body: some View {
        VStack(spacing: PWSTokens.spacing8) {
            Image(systemName: slot.systemImage)
                .font(.system(size: 22, weight: .semibold))
            Text(slot.title)
                .font(.system(size: 16, weight: .semibold))
            Text(slot.time)
                .font(.system(size: 12, weight: .medium))
        }
        .foregroundStyle(selected ? .white : PWSTokens.primaryText)
        .frame(maxWidth: .infinity, minHeight: 108)
        .background(selected ? AnyShapeStyle(PWSTokens.blueGradient) : AnyShapeStyle(PWSTokens.panelBackground))
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous)
                .stroke(selected ? Color.clear : PWSTokens.strongBorder, lineWidth: 1)
        }
        .shadow(color: selected ? PWSTokens.gradientStart.opacity(0.25) : .black.opacity(0.06), radius: 8, x: 0, y: 3)
        .accessibilityElement(children: .combine)
        .accessibilityValue(selected ? "선택됨" : "선택 안 됨")
    }
}

private struct OutfitAccordionRow: View {
    let title: String
    @Binding var value: String
    let expanded: Bool
    let options: [String]
    let onToggle: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing8) {
            Button(action: onToggle) {
                HStack(spacing: PWSTokens.spacing12) {
                    VStack(alignment: .leading, spacing: PWSTokens.spacing4) {
                        Text(title)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(PWSTokens.primaryText)
                        Text(value)
                            .font(.system(size: 14))
                            .foregroundStyle(PWSTokens.tertiaryText)
                            .lineLimit(1)
                            .minimumScaleFactor(0.82)
                            .allowsTightening(true)
                    }
                    Spacer()
                    Image(systemName: expanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(PWSTokens.mutedText)
                }
                .padding(PWSTokens.spacing16)
                .frame(maxWidth: .infinity, minHeight: 64)
                .background(PWSTokens.pageBackground)
                .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
            }
            .buttonStyle(PWSPressableButtonStyle(scale: 0.985, pressedOpacity: 0.9))
            .accessibilityLabel("\(title) \(value)")
            .accessibilityValue(expanded ? "펼쳐짐" : "접힘")

            if expanded {
                LazyVGrid(
                    columns: [GridItem(.adaptive(minimum: 82), spacing: PWSTokens.spacing8)],
                    alignment: .leading,
                    spacing: PWSTokens.spacing8
                ) {
                    ForEach(options, id: \.self) { option in
                        Button {
                            withAnimation(.snappy(duration: 0.16)) {
                                value = option
                            }
                            onToggle()
                        } label: {
                            Text(option)
                                .font(.system(size: 13, weight: option == value ? .semibold : .regular))
                                .foregroundStyle(option == value ? .white : PWSTokens.secondaryText)
                                .lineLimit(1)
                                .minimumScaleFactor(0.78)
                                .allowsTightening(true)
                                .frame(maxWidth: .infinity, minHeight: 36)
                                .padding(.horizontal, PWSTokens.spacing8)
                                .background(option == value ? AnyShapeStyle(PWSTokens.primaryText) : AnyShapeStyle(PWSTokens.secondaryPanelBackground))
                                .clipShape(Capsule())
                                .overlay {
                                    Capsule()
                                        .stroke(option == value ? Color.clear : PWSTokens.strongBorder, lineWidth: 1)
                                }
                        }
                        .buttonStyle(PWSPressableButtonStyle(scale: 0.96, pressedOpacity: 0.86))
                        .accessibilityValue(option == value ? "선택됨" : "선택 안 됨")
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
                .padding(.horizontal, PWSTokens.spacing4)
            }
        }
    }
}

private struct FeelChipCard: View {
    let title: String
    let chips: [String]
    @Binding var selected: String

    var body: some View {
        PWSStrictCard(radius: PWSTokens.radius) {
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(PWSTokens.primaryText)
            PWSWrapChips(chips: chips, selected: $selected)
        }
    }
}

private func feedbackSlot(_ label: String) -> FeedbackSlot {
    switch label {
    case "아침":
        return .morning
    case "저녁":
        return .evening
    default:
        return .afternoon
    }
}

private func temperatureFeelScore(_ label: String) -> Int {
    switch label {
    case "매우 추움":
        return 1
    case "추움":
        return 2
    case "선선함":
        return 3
    case "따뜻함":
        return 5
    case "더움":
        return 6
    case "매우 더움":
        return 7
    default:
        return 4
    }
}

private func humidityFeelScore(_ label: String) -> Int {
    switch label {
    case "건조함":
        return 1
    case "습함":
        return 4
    case "매우 습함":
        return 5
    default:
        return 3
    }
}

private func windFeelScore(_ label: String) -> Int {
    switch label {
    case "바람 없음":
        return 0
    case "보통 바람":
        return 2
    case "강한 바람":
        return 3
    default:
        return 1
    }
}

private func clothingScore(_ outer: String) -> Int {
    switch outer {
    case "없음":
        return 1
    case "코트":
        return 3
    default:
        return 2
    }
}

private func outfitItems(top: String, outer: String, bottom: String) -> [String] {
    [top, outer, bottom].filter { $0 != "없음" }
}
