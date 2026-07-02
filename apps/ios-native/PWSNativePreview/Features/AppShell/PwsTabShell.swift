import SwiftUI

struct PwsTabShell: View {
    let environment: AppEnvironment
    private let qaRemoteTesterId: String?
    @State private var session: PWSSession?
    @State private var selectedTab: PwsAppTab = .home
    @State private var feedbackState = FeedbackRepositoryState()
    @State private var weatherState = WeatherRepositoryState()
    @State private var predictionResult: PredictionResult?
    @State private var isAuthenticating = false
    @State private var authErrorMessage: String?
    @State private var runtimeErrorMessage: String?

    private let predictionService = PwsPredictionService(weightsStore: KeychainPredictionWeightsStore(keyValueStore: KeychainNativeKeyValueStore()))

    init(environment: AppEnvironment) {
        self.environment = environment
        let processEnvironment = ProcessInfo.processInfo.environment
        let qaAutoLogin = processEnvironment["PWS_UI_QA_AUTO_LOGIN"] == "1"
        let qaRemoteTesterId = processEnvironment["PWS_UI_QA_REMOTE_TESTER_ID"]?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .nilIfBlank
        let restored = environment.sessionStore.load().map {
            PWSSession(restoredRemoteSession: $0, fallbackTesterId: TesterAuth.figmaParityTesterId, testerAuth: environment.testerAuth)
        }
        self.qaRemoteTesterId = qaRemoteTesterId
        _session = State(initialValue: qaAutoLogin ? PWSSession(testerId: "pws_dev", environment: environment) : restored)
    }

    var body: some View {
        Group {
            if let session {
                VStack(spacing: 0) {
                    ZStack {
                        switch selectedTab {
                        case .home:
                            HomeScreen(environment: environment, session: session, weatherState: weatherState, feedbackState: feedbackState, predictionResult: predictionResult) {
                                withAnimation(.snappy) { selectedTab = .feedback }
                            }
                        case .feedback:
                            FeedbackScreen(session: session, feedbackState: feedbackState) { input in
                                let state = try await environment.feedbackRepository.submitFeedback(
                                    userId: session.localSessionId,
                                    input: input,
                                    currentWeather: weatherState.data?.current
                                )
                                await MainActor.run {
                                    feedbackState = state
                                    runtimeErrorMessage = nil
                                }
                                return state
                            }
                        case .history:
                            HistoryScreen(session: session, feedbackState: feedbackState)
                        case .settings:
                            SettingsScreen(session: session) {
                                do {
                                    try environment.sessionStore.clear()
                                    withAnimation(.snappy) {
                                        self.session = nil
                                        selectedTab = .home
                                        feedbackState = FeedbackRepositoryState()
                                        weatherState = WeatherRepositoryState()
                                        runtimeErrorMessage = nil
                                    }
                                } catch {
                                    runtimeErrorMessage = signOutCleanupErrorMessage
                                }
                            } onDeleteAccount: {
                                Task { await deleteAccount() }
                            }
                        }
                    }
                    if let runtimeErrorMessage {
                        RuntimeErrorBanner(message: runtimeErrorMessage)
                            .padding(.horizontal, PWSTokens.spacing16)
                            .padding(.vertical, PWSTokens.spacing8)
                    }
                    PWSBottomTabBar(selectedTab: $selectedTab)
                }
                .background(PWSTokens.pageBackground.ignoresSafeArea())
                .task(id: session.localSessionId) {
                    await refreshRemoteRuntime(for: session)
                }
                .onChange(of: selectedTab) { _, tab in
                    guard tab == .history else { return }
                    Task { await refreshHistory(for: session) }
                }
            } else {
                LoginScreen(
                    environment: environment,
                    isLoading: isAuthenticating,
                    errorMessage: authErrorMessage
                ) { email, password in
                    isAuthenticating = true
                    authErrorMessage = nil
                    Task {
                        do {
                            let remoteSession = try await environment.authClient.signInWithPassword(email: email, password: password)
                            let fallbackTesterId = testerIdForSession(email: email)
                            await MainActor.run {
                                isAuthenticating = false
                                withAnimation(.snappy) {
                                    session = PWSSession(
                                        remoteSession: remoteSession,
                                        fallbackTesterId: fallbackTesterId,
                                        testerAuth: environment.testerAuth
                                    )
                                }
                            }
                            await refreshRemoteRuntime(for: PWSSession(
                                remoteSession: remoteSession,
                                fallbackTesterId: fallbackTesterId,
                                testerAuth: environment.testerAuth
                            ))
                        } catch {
                            await MainActor.run {
                                isAuthenticating = false
                                authErrorMessage = testerAuthDisplayMessage(for: error)
                            }
                        }
                    }
                }
                .task(id: qaRemoteTesterId) {
                    await signInQARemoteTesterIfNeeded()
                }
            }
        }
    }

    @MainActor
    private func signInQARemoteTesterIfNeeded() async {
        guard session == nil, !isAuthenticating, let qaRemoteTesterId else { return }
        isAuthenticating = true
        authErrorMessage = nil
        do {
            let remoteSession = try await environment.authClient.signInTester(testerId: qaRemoteTesterId)
            let nextSession = PWSSession(
                remoteSession: remoteSession,
                fallbackTesterId: qaRemoteTesterId,
                testerAuth: environment.testerAuth
            )
            isAuthenticating = false
            withAnimation(.snappy) {
                session = nextSession
            }
            await refreshRemoteRuntime(for: nextSession)
        } catch {
            isAuthenticating = false
            authErrorMessage = testerAuthDisplayMessage(for: error)
        }
    }

    @MainActor
    private func refreshRemoteRuntime(for session: PWSSession) async {
        weatherState = WeatherRepositoryState(
            data: weatherState.data,
            isLoading: true,
            error: nil,
            lastLatitude: weatherState.lastLatitude,
            lastLongitude: weatherState.lastLongitude
        )
        async let weatherResult: Result<WeatherDataNative, Error> = fetchWeatherResult()
        async let feedbackResult: Result<FeedbackRepositoryState, Error> = fetchTodayFeedbackResult(for: session)
        let (weather, feedback) = await (weatherResult, feedbackResult)
        var didFail = false

        switch weather {
        case .success(let weather):
            weatherState = WeatherRepositoryState(
                data: weather,
                isLoading: false,
                error: nil,
                lastLatitude: 37.5665,
                lastLongitude: 126.9780
            )
        case .failure:
            didFail = true
            weatherState = WeatherRepositoryState(
                data: weatherState.data,
                isLoading: false,
                error: runtimeLoadErrorMessage,
                lastLatitude: weatherState.lastLatitude,
                lastLongitude: weatherState.lastLongitude
            )
        }

        switch feedback {
        case .success(let state):
            feedbackState = state
        case .failure:
            didFail = true
        }

        runtimeErrorMessage = didFail ? runtimeLoadErrorMessage : nil

        // Compute prediction
        predictionResult = predictionService.predict(
            weather: weatherState.data?.current,
            hourlyForecasts: weatherState.data?.hourly ?? [],
            feedbackState: feedbackState,
            userWeights: nil
        )
    }

    private func fetchWeatherResult() async -> Result<WeatherDataNative, Error> {
        do {
            return .success(try await environment.weatherClient.fetchWeather(latitude: 37.5665, longitude: 126.9780))
        } catch {
            return .failure(error)
        }
    }

    private func fetchTodayFeedbackResult(for session: PWSSession) async -> Result<FeedbackRepositoryState, Error> {
        do {
            return .success(try await environment.feedbackRepository.fetchTodayStatus(userId: session.localSessionId))
        } catch {
            return .failure(error)
        }
    }

    @MainActor
    private func refreshHistory(for session: PWSSession) async {
        do {
            let endDate = FeedbackContract().pwsDateString(from: Date())
            let startDate = FeedbackContract().pwsDateString(from: Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? Date())
            feedbackState = try await environment.feedbackRepository.fetchHistory(
                userId: session.localSessionId,
                startDate: startDate,
                endDate: endDate
            )
            runtimeErrorMessage = nil
        } catch {
            runtimeErrorMessage = runtimeLoadErrorMessage
        }
    }

    @MainActor
    private func deleteAccount() async {
        do {
            try await environment.accountDeletionClient.deleteOwnAccount()
            try environment.sessionStore.clear()
            withAnimation(.snappy) {
                session = nil
                selectedTab = .home
                feedbackState = FeedbackRepositoryState()
                weatherState = WeatherRepositoryState()
                runtimeErrorMessage = nil
            }
        } catch {
            runtimeErrorMessage = accountDeletionErrorMessage
        }
    }

    private func testerIdForSession(email: String) -> String {
        environment.testerAuth.testerId(fromEmail: email)
            ?? email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }
}

private let runtimeLoadErrorMessage = "실시간 데이터를 불러오지 못했습니다. 네트워크와 로그인 상태를 확인해주세요."
private let signOutCleanupErrorMessage = "로그아웃 정리를 완료하지 못했습니다. 다시 시도해주세요."
private let accountDeletionErrorMessage = "계정 삭제가 완료되지 않았습니다. 잠시 후 다시 시도해주세요."

private struct RuntimeErrorBanner: View {
    let message: String

    var body: some View {
        Label(message, systemImage: "exclamationmark.triangle.fill")
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(PWSTokens.redText)
            .lineLimit(2)
            .minimumScaleFactor(0.86)
            .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
            .padding(.horizontal, PWSTokens.spacing16)
            .background(Color(red: 1.0, green: 0.95, blue: 0.95))
            .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                    .stroke(Color(red: 1.0, green: 0.79, blue: 0.79), lineWidth: 1)
            }
            .accessibilityLabel(message)
    }
}

enum PwsAppTab: String, CaseIterable, Identifiable {
    case home
    case feedback
    case history
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: "홈"
        case .feedback: "기록"
        case .history: "히스토리"
        case .settings: "설정"
        }
    }

    var systemImage: String {
        switch self {
        case .home: "house"
        case .feedback: "message"
        case .history: "calendar"
        case .settings: "gearshape"
        }
    }
}

private struct PWSBottomTabBar: View {
    @Binding var selectedTab: PwsAppTab

    var body: some View {
        HStack {
            ForEach(PwsAppTab.allCases) { tab in
                Button {
                    selectedTab = tab
                } label: {
                    VStack(spacing: 6) {
                        Rectangle()
                            .fill(selectedTab == tab ? AnyShapeStyle(PWSTokens.blueGradient) : AnyShapeStyle(Color.clear))
                            .frame(width: 32, height: 4)
                            .clipShape(Capsule())
                        Image(systemName: tab.systemImage)
                            .font(.system(size: 21, weight: .semibold))
                            .frame(height: 24)
                        Text(tab.title)
                            .font(.system(size: 10, weight: .semibold))
                            .tracking(0.1)
                    }
                    .foregroundStyle(selectedTab == tab ? PWSTokens.primaryText : PWSTokens.mutedText)
                    .frame(maxWidth: .infinity, minHeight: 62)
                    .contentShape(Rectangle())
                }
                .buttonStyle(PWSPressableButtonStyle(scale: 0.96, pressedOpacity: 0.86))
                .accessibilityLabel(tab.title)
                .accessibilityValue(selectedTab == tab ? "선택됨" : "선택 안 됨")
            }
        }
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.top, 4)
        .padding(.bottom, 10)
        .frame(height: 80)
        .background(PWSTokens.panelBackground.opacity(0.95))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(PWSTokens.border)
                .frame(height: 1)
        }
    }
}

private extension String {
    var nilIfBlank: String? {
        isEmpty ? nil : self
    }
}

struct PWSSession: Equatable {
    let testerId: String
    let testerEmail: String
    let localSessionId: String

    init(testerId: String, environment: AppEnvironment) {
        self.testerId = environment.testerAuth.normalizedTesterId(testerId)
        self.testerEmail = environment.testerAuth.testerEmail(for: testerId)
        self.localSessionId = environment.testerAuth.localSessionId(for: testerId)
    }

    init(remoteSession: NativeSupabaseSession, fallbackTesterId: String, testerAuth: TesterAuth) {
        let remoteEmail = remoteSession.userEmail?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let sessionTesterId = testerAuth.testerId(fromEmail: remoteEmail) ?? testerAuth.normalizedTesterId(fallbackTesterId)
        self.testerId = sessionTesterId
        self.testerEmail = remoteEmail?.isEmpty == false ? remoteEmail! : testerAuth.testerEmail(for: sessionTesterId)
        let remoteUserId = remoteSession.userId?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        self.localSessionId = remoteUserId.isEmpty ? testerAuth.localSessionId(for: sessionTesterId) : remoteUserId
    }

    init(restoredRemoteSession: NativeSupabaseSession, fallbackTesterId: String, testerAuth: TesterAuth) {
        let restoredTesterId = testerAuth.testerId(fromEmail: restoredRemoteSession.userEmail) ?? fallbackTesterId
        self.init(remoteSession: restoredRemoteSession, fallbackTesterId: restoredTesterId, testerAuth: testerAuth)
    }

    var displayName: String {
        testerId.isEmpty ? "테스터" : testerId
    }
}
