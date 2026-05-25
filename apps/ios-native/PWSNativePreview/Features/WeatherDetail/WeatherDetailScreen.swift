import SwiftUI

struct WeatherDetailScreen: View {
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""

    private let favoriteRegions = [
        RegionOption(name: "강남역", detail: "강남구"),
        RegionOption(name: "잠실", detail: "송파구"),
        RegionOption(name: "판교", detail: "성남시"),
        RegionOption(name: "동탄", detail: "화성시"),
        RegionOption(name: "송도", detail: "연수구"),
        RegionOption(name: "해운대", detail: "해운대구")
    ]

    private let provinces = ["서울특별시", "경기도", "인천광역시", "부산광역시"]

    var body: some View {
        VStack(spacing: 0) {
            PWSStrictScreen {
                header

                PWSStrictSection(title: "어디 날씨를 확인할까요?") {
                    HStack(spacing: PWSTokens.spacing12) {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(PWSTokens.mutedText)
                        TextField("지역명 검색 (예: 강남, 판교, 잠실)", text: $query)
                            .font(.system(size: 16))
                            .textInputAutocapitalization(.never)
                    }
                    .padding(.horizontal, PWSTokens.spacing16)
                    .frame(maxWidth: .infinity, minHeight: 60)
                    .background(PWSTokens.panelBackground)
                    .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                            .stroke(PWSTokens.border, lineWidth: 1)
                    }
                }

                PWSStrictSection(title: "자주 찾는 지역") {
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: PWSTokens.spacing12), GridItem(.flexible(), spacing: PWSTokens.spacing12)], spacing: PWSTokens.spacing12) {
                        ForEach(favoriteRegions) { region in
                            RegionTile(region: region)
                        }
                    }
                }

                PWSStrictSection(title: "시/도 선택") {
                    VStack(spacing: PWSTokens.spacing12) {
                        ForEach(provinces, id: \.self) { province in
                            PWSStrictCard(radius: PWSTokens.compactRadius, shadow: false) {
                                HStack {
                                    Text(province)
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundStyle(PWSTokens.primaryText)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundStyle(PWSTokens.mutedText)
                                }
                                .frame(minHeight: 28)
                            }
                        }
                    }
                }
            }

            VStack {
                Text("다음")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(PWSTokens.mutedText)
                    .frame(maxWidth: .infinity, minHeight: 56)
                    .background(PWSTokens.divider)
                    .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
                    .shadow(color: .black.opacity(0.12), radius: 14, x: 0, y: 8)
                    .padding(.horizontal, PWSTokens.spacing24)
                    .padding(.top, PWSTokens.spacing24)
                    .padding(.bottom, PWSTokens.spacing24)
            }
            .background(PWSTokens.panelBackground)
            .overlay(alignment: .top) {
                Rectangle().fill(PWSTokens.border).frame(height: 1)
            }
        }
        .background(PWSTokens.pageBackground.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing16) {
            HStack(spacing: PWSTokens.spacing12) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 19, weight: .semibold))
                        .foregroundStyle(PWSTokens.primaryText)
                        .frame(width: 36, height: 36)
                }
                .buttonStyle(.plain)
                Text("지역 선택")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(PWSTokens.primaryText)
            }

            HStack(spacing: PWSTokens.spacing8) {
                StepBadge(number: "1", label: "지역", active: true)
                Text("·").foregroundStyle(PWSTokens.mutedText)
                StepBadge(number: "2", label: "기간", active: false)
                Text("·").foregroundStyle(PWSTokens.mutedText)
                StepBadge(number: "3", label: "확인", active: false)
            }
        }
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.top, PWSTokens.spacing24)
        .padding(.bottom, PWSTokens.spacing24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PWSTokens.panelBackground)
        .overlay(alignment: .bottom) {
            Rectangle().fill(PWSTokens.border).frame(height: 1)
        }
    }
}

private struct RegionOption: Identifiable {
    let id = UUID()
    let name: String
    let detail: String
}

private struct StepBadge: View {
    let number: String
    let label: String
    let active: Bool

    var body: some View {
        HStack(spacing: PWSTokens.spacing8) {
            Text(number)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(active ? .white : PWSTokens.mutedText)
                .frame(width: 24, height: 24)
                .background(active ? AnyShapeStyle(PWSTokens.blueGradient) : AnyShapeStyle(PWSTokens.strongBorder))
                .clipShape(Circle())
            Text(label)
                .font(.system(size: 14))
                .foregroundStyle(active ? PWSTokens.tertiaryText : PWSTokens.mutedText)
        }
    }
}

private struct RegionTile: View {
    let region: RegionOption

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing8) {
            HStack(spacing: PWSTokens.spacing8) {
                Image(systemName: "mappin.circle")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(PWSTokens.secondaryText)
                Text(region.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(PWSTokens.primaryText)
            }
            Text(region.detail)
                .font(.system(size: 14))
                .foregroundStyle(PWSTokens.secondaryText)
        }
        .padding(PWSTokens.spacing16)
        .frame(maxWidth: .infinity, minHeight: 80, alignment: .leading)
        .background(PWSTokens.panelBackground)
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                .stroke(PWSTokens.border, lineWidth: 1)
        }
    }
}
