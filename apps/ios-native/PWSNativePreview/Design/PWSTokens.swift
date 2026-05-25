import SwiftUI

enum PWSTokens {
    static let actionBlue = Color(red: 0.00, green: 0.65, blue: 0.96)
    static let actionBluePressed = Color(red: 0.08, green: 0.36, blue: 0.99)
    static let pageBackground = Color(red: 0.98, green: 0.98, blue: 0.98)
    static let panelBackground = Color.white
    static let secondaryPanelBackground = Color(red: 0.96, green: 0.96, blue: 0.96)
    static let warmPanelBackground = Color(red: 0.98, green: 0.98, blue: 0.98)
    static let primaryText = Color(red: 0.11, green: 0.10, blue: 0.09)
    static let secondaryText = Color(red: 0.34, green: 0.33, blue: 0.30)
    static let tertiaryText = Color(red: 0.47, green: 0.44, blue: 0.42)
    static let mutedText = Color(red: 0.65, green: 0.63, blue: 0.61)
    static let border = Color(red: 0.96, green: 0.96, blue: 0.96)
    static let strongBorder = Color(red: 0.91, green: 0.90, blue: 0.89)
    static let divider = Color(red: 0.91, green: 0.90, blue: 0.89)
    static let success = Color(red: 0.12, green: 0.48, blue: 0.32)
    static let warning = Color(red: 0.68, green: 0.36, blue: 0.04)
    static let gradientStart = Color(red: 0.00, green: 0.65, blue: 0.96)
    static let gradientEnd = Color(red: 0.08, green: 0.36, blue: 0.99)
    static let redText = Color(red: 0.91, green: 0.00, blue: 0.04)
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
