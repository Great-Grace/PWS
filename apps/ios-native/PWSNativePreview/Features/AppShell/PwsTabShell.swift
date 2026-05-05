import SwiftUI

struct PwsTabShell: View {
    let environment: AppEnvironment

    var body: some View {
        TabView {
            HomeScreen(environment: environment)
                .tabItem { Label("홈", systemImage: "house") }
            PlaceholderScreen(title: "피드백", subtitle: "Feedback contract ready")
                .tabItem { Label("피드백", systemImage: "slider.horizontal.3") }
            PlaceholderScreen(title: "히스토리", subtitle: "History contract ready")
                .tabItem { Label("히스토리", systemImage: "clock") }
            PlaceholderScreen(title: "설정", subtitle: "Auth/profile contract ready")
                .tabItem { Label("설정", systemImage: "gearshape") }
        }
        .tint(PWSTokens.actionBlue)
    }
}

private struct PlaceholderScreen: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing) {
            Text(title).font(.title2).fontWeight(.semibold)
            Text(subtitle).foregroundStyle(PWSTokens.secondaryText)
            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(PWSTokens.spacing)
        .background(PWSTokens.pageBackground)
    }
}

