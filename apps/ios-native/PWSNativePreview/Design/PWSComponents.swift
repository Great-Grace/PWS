import SwiftUI

struct PWSPage<Content: View>: View {
    let title: String?
    let subtitle: String?
    @ViewBuilder let content: Content

    init(title: String? = nil, subtitle: String? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.subtitle = subtitle
        self.content = content()
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PWSTokens.spacing24) {
                if title != nil || subtitle != nil {
                    VStack(alignment: .leading, spacing: PWSTokens.spacing8) {
                        if let title {
                            Text(title)
                                .font(.system(size: 24, weight: .semibold))
                                .foregroundStyle(PWSTokens.primaryText)
                                .accessibilityAddTraits(.isHeader)
                        }
                        if let subtitle {
                            Text(subtitle)
                                .font(.system(size: 14))
                                .foregroundStyle(PWSTokens.tertiaryText)
                                .lineSpacing(2)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                content
            }
            .padding(.horizontal, PWSTokens.spacing24)
            .padding(.top, PWSTokens.spacing24)
            .padding(.bottom, PWSTokens.spacing48)
        }
        .scrollIndicators(.hidden)
        .background(PWSTokens.pageBackground.ignoresSafeArea())
    }
}

struct PWSCard<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing17) {
            content
        }
        .padding(PWSTokens.spacing20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PWSTokens.panelBackground)
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous)
                .stroke(PWSTokens.border, lineWidth: 1)
        }
    }
}

struct PWSSection<Content: View>: View {
    let title: String
    let subtitle: String?
    @ViewBuilder let content: Content

    init(title: String, subtitle: String? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.subtitle = subtitle
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing12) {
            VStack(alignment: .leading, spacing: PWSTokens.spacing4) {
                Text(title)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(PWSTokens.primaryText)
                    .accessibilityAddTraits(.isHeader)
                if let subtitle {
                    Text(subtitle)
                        .font(.callout)
                        .foregroundStyle(PWSTokens.secondaryText)
                }
            }
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct PWSPrimaryButton: View {
    @Environment(\.isEnabled) private var isEnabled
    let title: String
    let systemImage: String?
    let action: () -> Void

    init(_ title: String, systemImage: String? = nil, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: systemImage ?? "arrow.right")
                .font(.system(.body, design: .default, weight: .semibold))
                .labelStyle(.titleAndIcon)
                .lineLimit(1)
                .minimumScaleFactor(0.82)
                .allowsTightening(true)
                .frame(maxWidth: .infinity, minHeight: PWSTokens.minTouchTarget)
                .padding(.horizontal, PWSTokens.spacing17)
        }
        .buttonStyle(PWSPressableButtonStyle())
        .foregroundStyle(.white)
        .background(isEnabled ? AnyShapeStyle(PWSTokens.blueGradient) : AnyShapeStyle(PWSTokens.divider))
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
    }
}

struct PWSSecondaryButton: View {
    let title: String
    let systemImage: String?
    let action: () -> Void

    init(_ title: String, systemImage: String? = nil, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: systemImage ?? "chevron.right")
                .font(.system(.callout, design: .default, weight: .semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.82)
                .allowsTightening(true)
                .frame(minHeight: PWSTokens.minTouchTarget)
                .padding(.horizontal, PWSTokens.spacing17)
        }
        .buttonStyle(PWSPressableButtonStyle())
        .foregroundStyle(PWSTokens.actionBlue)
        .background(PWSTokens.secondaryPanelBackground)
        .clipShape(Capsule())
        .overlay {
            Capsule().stroke(PWSTokens.border, lineWidth: 1)
        }
    }
}

struct PWSPill: View {
    let text: String
    let isSelected: Bool

    var body: some View {
        Text(text)
            .font(.system(.callout, design: .default, weight: .semibold))
            .foregroundStyle(isSelected ? .white : PWSTokens.primaryText)
            .lineLimit(1)
            .minimumScaleFactor(0.82)
            .allowsTightening(true)
            .frame(minHeight: PWSTokens.minTouchTarget)
            .padding(.horizontal, PWSTokens.spacing17)
            .background(isSelected ? PWSTokens.actionBlue : PWSTokens.secondaryPanelBackground)
            .clipShape(Capsule())
            .overlay {
                Capsule().stroke(isSelected ? PWSTokens.actionBlue : PWSTokens.border, lineWidth: 1)
            }
    }
}

struct PWSSegmentedControl<Option: Equatable>: View {
    let options: [(Option, String)]
    @Binding var selection: Option

    var body: some View {
        HStack(spacing: PWSTokens.spacing8) {
            ForEach(Array(options.enumerated()), id: \.offset) { _, item in
                let option = item.0
                let label = item.1
                Button {
                    selection = option
                } label: {
                    PWSPill(text: label, isSelected: selection == option)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(label)
                .accessibilityValue(selection == option ? "선택됨" : "선택 안 됨")
            }
        }
    }
}

struct PWSMetricTile: View {
    let label: String
    let value: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing8) {
            Text(label)
                .font(.caption)
                .foregroundStyle(PWSTokens.tertiaryText)
            Text(value)
                .font(.system(.title2, design: .default, weight: .semibold))
                .foregroundStyle(PWSTokens.primaryText)
                .minimumScaleFactor(0.78)
                .lineLimit(1)
            Text(detail)
                .font(.caption)
                .foregroundStyle(PWSTokens.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(PWSTokens.spacing12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PWSTokens.secondaryPanelBackground)
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

struct PWSAppHeader: View {
    let title: String
    let subtitle: String?

    init(_ title: String, subtitle: String? = nil) {
        self.title = title
        self.subtitle = subtitle
    }

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing8) {
            Text(title)
                .font(.system(size: 24, weight: .semibold))
                .foregroundStyle(PWSTokens.primaryText)
                .accessibilityAddTraits(.isHeader)
            if let subtitle {
                Text(subtitle)
                    .font(.system(size: 14))
                    .foregroundStyle(PWSTokens.tertiaryText)
            }
        }
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.top, PWSTokens.spacing20)
        .padding(.bottom, PWSTokens.spacing16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PWSTokens.panelBackground)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(PWSTokens.border)
                .frame(height: 1)
        }
    }
}

struct PWSStrictScreen<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                content
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, PWSTokens.spacing16)
        }
        .scrollIndicators(.hidden)
        .background(PWSTokens.pageBackground.ignoresSafeArea())
    }
}

struct PWSStrictSection<Content: View>: View {
    let title: String
    var background: Color = PWSTokens.pageBackground
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing12) {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color(red: 0.27, green: 0.25, blue: 0.23))
            content
        }
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.top, PWSTokens.spacing24)
        .padding(.bottom, PWSTokens.spacing24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(background)
    }
}

struct PWSStrictCard<Content: View>: View {
    var radius: CGFloat = PWSTokens.compactRadius
    var fill: Color = PWSTokens.panelBackground
    var border: Color = PWSTokens.border
    var shadow: Bool = true
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing12) {
            content
        }
        .padding(PWSTokens.spacing14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(fill)
        .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .stroke(border, lineWidth: 1)
        }
        .shadow(color: shadow ? .black.opacity(0.08) : .clear, radius: 8, x: 0, y: 2)
    }
}

struct PWSGradientActionCard: View {
    let title: String
    let subtitle: String?
    let systemImage: String

    var body: some View {
        HStack(spacing: PWSTokens.spacing12) {
            VStack(alignment: .leading, spacing: PWSTokens.spacing8) {
                HStack(spacing: PWSTokens.spacing8) {
                    Image(systemName: systemImage)
                        .font(.system(size: 14, weight: .semibold))
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                }
                if let subtitle {
                    Text(subtitle)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.white.opacity(0.9))
                }
            }
            Spacer()
            Image(systemName: "arrow.right")
                .font(.system(size: 16, weight: .semibold))
                .frame(width: 36, height: 36)
                .background(.white.opacity(0.2))
                .clipShape(RoundedRectangle(cornerRadius: PWSTokens.smallRadius, style: .continuous))
        }
        .foregroundStyle(.white)
        .padding(PWSTokens.spacing24)
        .frame(maxWidth: .infinity, minHeight: 100, alignment: .leading)
        .background(PWSTokens.blueGradient)
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
        .shadow(color: PWSTokens.gradientStart.opacity(0.3), radius: 12, x: 0, y: 8)
    }
}

struct PWSChip: View {
    let title: String
    var selected = false

    var body: some View {
        Text(title)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(selected ? .white : Color(red: 0.27, green: 0.25, blue: 0.23))
            .lineLimit(1)
            .minimumScaleFactor(0.82)
            .allowsTightening(true)
            .padding(.horizontal, PWSTokens.spacing12)
            .frame(minWidth: 68, minHeight: 40)
            .background(selected ? AnyShapeStyle(PWSTokens.blueGradient) : AnyShapeStyle(PWSTokens.panelBackground))
            .clipShape(Capsule())
            .overlay {
                Capsule()
                    .stroke(selected ? Color.clear : PWSTokens.border, lineWidth: 1)
            }
            .shadow(color: selected ? PWSTokens.gradientStart.opacity(0.2) : .clear, radius: 6, x: 0, y: 3)
    }
}

struct PWSWrapChips: View {
    let chips: [String]
    @Binding var selected: String

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 76), spacing: PWSTokens.spacing8)], alignment: .leading, spacing: PWSTokens.spacing8) {
            ForEach(chips, id: \.self) { chip in
                Button {
                    selected = chip
                } label: {
                    PWSChip(title: chip, selected: chip == selected)
                }
                .buttonStyle(PWSPressableButtonStyle(scale: 0.96))
                .accessibilityLabel(chip)
                .accessibilityValue(chip == selected ? "선택됨" : "선택 안 됨")
            }
        }
    }
}

struct PWSPressableButtonStyle: ButtonStyle {
    var scale: CGFloat = 0.98
    var pressedOpacity: Double = 0.9

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? scale : 1)
            .opacity(configuration.isPressed ? pressedOpacity : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct PWSIconSquare: View {
    let systemName: String
    var fill: Color = PWSTokens.secondaryPanelBackground
    var foreground: Color = PWSTokens.primaryText
    var size: CGFloat = 36

    var body: some View {
        Image(systemName: systemName)
            .font(.system(size: size * 0.42, weight: .semibold))
            .foregroundStyle(foreground)
            .frame(width: size, height: size)
            .background(fill)
            .clipShape(RoundedRectangle(cornerRadius: PWSTokens.smallRadius, style: .continuous))
    }
}

struct PWSSettingItem: View {
    let title: String
    let subtitle: String?
    let value: String?
    let systemImage: String
    var showChevron = true

    init(_ title: String, subtitle: String? = nil, value: String? = nil, systemImage: String, showChevron: Bool = true) {
        self.title = title
        self.subtitle = subtitle
        self.value = value
        self.systemImage = systemImage
        self.showChevron = showChevron
    }

    var body: some View {
        HStack(spacing: PWSTokens.spacing12) {
            PWSIconSquare(systemName: systemImage, fill: PWSTokens.warmPanelBackground, size: 36)
            VStack(alignment: .leading, spacing: PWSTokens.spacing4) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(PWSTokens.primaryText)
                if let subtitle {
                    Text(subtitle)
                        .font(.system(size: 14))
                        .foregroundStyle(PWSTokens.tertiaryText)
                }
            }
            Spacer(minLength: PWSTokens.spacing8)
            if let value {
                Text(value)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(PWSTokens.tertiaryText)
            }
            if showChevron {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(PWSTokens.mutedText)
            }
        }
        .frame(minHeight: 56)
        .accessibilityElement(children: .combine)
    }
}

struct PWSToggleRow: View {
    let title: String
    let subtitle: String
    let systemImage: String
    @Binding var isOn: Bool

    var body: some View {
        Toggle(isOn: $isOn) {
            HStack(spacing: PWSTokens.spacing12) {
                PWSIconSquare(systemName: systemImage, fill: PWSTokens.warmPanelBackground, size: 36)
                VStack(alignment: .leading, spacing: PWSTokens.spacing4) {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(PWSTokens.primaryText)
                    Text(subtitle)
                        .font(.system(size: 14))
                        .foregroundStyle(PWSTokens.tertiaryText)
                }
            }
        }
        .tint(PWSTokens.actionBlue)
        .frame(minHeight: 72)
    }
}

struct PWSInfoRow: View {
    let label: String
    let value: String
    let systemImage: String?

    init(_ label: String, value: String, systemImage: String? = nil) {
        self.label = label
        self.value = value
        self.systemImage = systemImage
    }

    var body: some View {
        HStack(spacing: PWSTokens.spacing12) {
            if let systemImage {
                Image(systemName: systemImage)
                    .foregroundStyle(PWSTokens.actionBlue)
                    .frame(width: 24)
                    .accessibilityHidden(true)
            }
            Text(label)
                .font(.body)
                .foregroundStyle(PWSTokens.primaryText)
            Spacer(minLength: PWSTokens.spacing12)
            Text(value)
                .font(.callout)
                .foregroundStyle(PWSTokens.secondaryText)
                .multilineTextAlignment(.trailing)
        }
        .frame(minHeight: PWSTokens.minTouchTarget)
        .accessibilityElement(children: .combine)
    }
}

struct PWSStatusBanner: View {
    let title: String
    let message: String
    let kind: Kind

    enum Kind {
        case info
        case success
        case warning

        var color: Color {
            switch self {
            case .info: PWSTokens.actionBlue
            case .success: PWSTokens.success
            case .warning: PWSTokens.warning
            }
        }

        var iconName: String {
            switch self {
            case .info: "info.circle.fill"
            case .success: "checkmark.circle.fill"
            case .warning: "exclamationmark.triangle.fill"
            }
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: PWSTokens.spacing12) {
            Image(systemName: kind.iconName)
                .foregroundStyle(kind.color)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: PWSTokens.spacing4) {
                Text(title)
                    .font(.system(.callout, design: .default, weight: .semibold))
                    .foregroundStyle(PWSTokens.primaryText)
                Text(message)
                    .font(.caption)
                    .foregroundStyle(PWSTokens.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(PWSTokens.spacing12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PWSTokens.secondaryPanelBackground)
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                .stroke(PWSTokens.border, lineWidth: 1)
        }
        .accessibilityElement(children: .combine)
    }
}
