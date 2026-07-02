import SwiftUI

@main
struct PWSNativePreviewApp: App {
    private let environment = AppEnvironment.preview

    var body: some Scene {
        WindowGroup {
            PwsTabShell(environment: environment)
        }
    }
}

