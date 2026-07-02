import SwiftUI

enum PWSTokens {
    static func dynamic(light: Color, dark: Color) -> Color {
        Color(UIColor { traitCollection in
            traitCollection.userInterfaceStyle == .dark ? UIColor(dark) : UIColor(light)
        })
    }

    static let actionBlue = dynamic(light: Color(red: 0.00, green: 0.65, blue: 0.96), dark: Color(red: 0.15, green: 0.70, blue: 0.98))
    static let actionBluePressed = dynamic(light: Color(red: 0.08, green: 0.36, blue: 0.99), dark: Color(red: 0.10, green: 0.40, blue: 1.0))
    static let pageBackground = dynamic(light: Color(red: 0.98, green: 0.98, blue: 0.98), dark: Color(red: 0.06, green: 0.06, blue: 0.06))
    static let panelBackground = dynamic(light: .white, dark: Color(red: 0.12, green: 0.12, blue: 0.12))
    static let secondaryPanelBackground = dynamic(light: Color(red: 0.96, green: 0.96, blue: 0.96), dark: Color(red: 0.18, green: 0.18, blue: 0.18))
    static let warmPanelBackground = dynamic(light: Color(red: 0.98, green: 0.98, blue: 0.98), dark: Color(red: 0.15, green: 0.15, blue: 0.15))
    static let primaryText = dynamic(light: Color(red: 0.11, green: 0.10, blue: 0.09), dark: Color(red: 0.95, green: 0.95, blue: 0.95))
    static let secondaryText = dynamic(light: Color(red: 0.34, green: 0.33, blue: 0.30), dark: Color(red: 0.75, green: 0.75, blue: 0.75))
    static let tertiaryText = dynamic(light: Color(red: 0.47, green: 0.44, blue: 0.42), dark: Color(red: 0.6, green: 0.6, blue: 0.6))
    static let mutedText = dynamic(light: Color(red: 0.65, green: 0.63, blue: 0.61), dark: Color(red: 0.45, green: 0.45, blue: 0.45))
    static let border = dynamic(light: Color(red: 0.96, green: 0.96, blue: 0.96), dark: Color(red: 0.22, green: 0.22, blue: 0.22))
    static let strongBorder = dynamic(light: Color(red: 0.91, green: 0.90, blue: 0.89), dark: Color(red: 0.3, green: 0.3, blue: 0.3))
    static let divider = dynamic(light: Color(red: 0.91, green: 0.90, blue: 0.89), dark: Color(red: 0.25, green: 0.25, blue: 0.25))
    static let success = dynamic(light: Color(red: 0.12, green: 0.48, blue: 0.32), dark: Color(red: 0.20, green: 0.60, blue: 0.40))
    static let warning = dynamic(light: Color(red: 0.68, green: 0.36, blue: 0.04), dark: Color(red: 0.80, green: 0.45, blue: 0.10))
    static let gradientStart = dynamic(light: Color(red: 0.00, green: 0.65, blue: 0.96), dark: Color(red: 0.10, green: 0.75, blue: 1.0))
    static let gradientEnd = dynamic(light: Color(red: 0.08, green: 0.36, blue: 0.99), dark: Color(red: 0.18, green: 0.45, blue: 1.0))
    static let redText = dynamic(light: Color(red: 0.91, green: 0.00, blue: 0.04), dark: Color(red: 1.0, green: 0.30, blue: 0.35))

    // MARK: - 체감 색상 (1~7 스케일, 전 앱 공통)
    static func feelColor(for score: Double) -> Color {
        switch score {
        case ..<2:    return Color(red: 0.3, green: 0.5, blue: 1.0)
        case ..<3:    return Color(red: 0.4, green: 0.65, blue: 1.0)
        case ..<4:    return Color(red: 0.3, green: 0.8, blue: 0.6)
        case ..<5:    return Color(red: 0.4, green: 0.85, blue: 0.4)
        case ..<6:    return Color(red: 1.0, green: 0.7, blue: 0.3)
        default:      return Color(red: 1.0, green: 0.4, blue: 0.3)
        }
    }
    
    static let spacing4: CGFloat = 4
    static let spacing8: CGFloat = 8
    static let spacing12: CGFloat = 12
    static let spacing14: CGFloat = 14
    static let spacing16: CGFloat = 16
    static let spacing17: CGFloat = 17
    static let spacing20: CGFloat = 20
    static let spacing24: CGFloat = 24
    static let spacing32: CGFloat = 32
    static let spacing48: CGFloat = 48
    static let spacing: CGFloat = spacing16
    static let radius: CGFloat = 24
    static let compactRadius: CGFloat = 16
    static let smallRadius: CGFloat = 14
    static let minTouchTarget: CGFloat = 44

    static var blueGradient: LinearGradient {
        LinearGradient(
            colors: [gradientStart, gradientEnd],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}
