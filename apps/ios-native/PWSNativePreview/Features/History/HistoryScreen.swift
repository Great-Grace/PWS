import SwiftUI

struct HistoryScreen: View {
    let session: PWSSession
    let feedbackState: FeedbackRepositoryState

    private var summary: HistorySummaryNative {
        HistorySummaryFactory().summary(from: feedbackState)
    }

    private var displayedRecords: [HistoryRecord] {
        feedbackState.recentEntries.map { entry in
            HistoryRecord(
                date: Self.displayDate(entry.feedbackDate),
                slot: entry.feedbackSlot.label,
                feel: Self.feelLabel(entry.feelScore),
                outfit: entry.clothingItems?.joined(separator: ", ") ?? "옷차림 미기록"
            )
        }
    }

    var body: some View {
        PWSStrictScreen {
            PWSAppHeader("히스토리", subtitle: "나의 체감 기록과 분석")

            streakBadge

            PWSStrictSection(title: "주간 쾌적도 추이") {
                PWSStrictCard(radius: PWSTokens.radius) {
                    ComfortChart(entries: feedbackState.recentEntries)
                    VStack(spacing: PWSTokens.spacing4) {
                        Text("체감 평균")
                            .font(.system(size: 14))
                            .foregroundStyle(PWSTokens.secondaryText)
                        Text(Self.averageFeelLabel(entries: feedbackState.recentEntries))
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(PWSTokens.primaryText)
                    }
                    .frame(maxWidth: .infinity, minHeight: 78)
                    .background(PWSTokens.pageBackground)
                    .clipShape(RoundedRectangle(cornerRadius: PWSTokens.smallRadius, style: .continuous))
                }
            }

            PWSStrictSection(title: "캘린더") {
                CalendarMonthCard(entries: feedbackState.recentEntries)
            }

            PWSStrictSection(title: "최근 기록") {
                VStack(spacing: PWSTokens.spacing12) {
                    if displayedRecords.isEmpty {
                        PWSStatusBanner(
                            title: "기록 없음",
                            message: "저장된 체감 기록이 있으면 이곳에 표시됩니다.",
                            kind: .info
                        )
                    } else {
                        ForEach(displayedRecords) { record in
                            HistoryRecordCard(record: record)
                        }
                    }
                }
            }

            PWSStrictSection(title: "옷차림 분석") {
                OutfitAnalysisCard(entries: feedbackState.recentEntries)
            }
        }
    }

    private var streakBadge: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing20) {
            HStack {
                HStack(spacing: PWSTokens.spacing16) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 28, weight: .semibold))
                        .frame(width: 64, height: 64)
                        .background(.white.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                    VStack(alignment: .leading, spacing: PWSTokens.spacing4) {
                        Text("연속 기록")
                            .font(.system(size: 14))
                            .foregroundStyle(.white.opacity(0.8))
                        Text("\(Self.distinctRecordedDays(entries: feedbackState.recentEntries))일")
                            .font(.system(size: 30, weight: .bold))
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: PWSTokens.spacing4) {
                    Text(summary.metrics.first?.label ?? "최장 기록")
                        .font(.system(size: 14))
                        .foregroundStyle(.white.opacity(0.8))
                    Text(summary.metrics.first?.value ?? "0개")
                        .font(.system(size: 24, weight: .bold))
                }
            }
            Rectangle()
                .fill(.white.opacity(0.2))
                .frame(height: 1)
            Text(summary.trendMessage)
                .font(.system(size: 14))
                .foregroundStyle(.white.opacity(0.9))
                .lineLimit(2)
                .minimumScaleFactor(0.84)
        }
        .foregroundStyle(.white)
        .padding(PWSTokens.spacing24)
        .frame(maxWidth: .infinity, minHeight: 169, alignment: .leading)
        .background(
            LinearGradient(colors: [Color(red: 1.0, green: 0.41, blue: 0.0), Color(red: 1.0, green: 0.13, blue: 0.34)], startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
        .shadow(color: .black.opacity(0.14), radius: 16, x: 0, y: 8)
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.top, PWSTokens.spacing24)
    }

    private static func displayDate(_ value: String) -> String {
        let parts = value.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return value }
        return "\(parts[1])월 \(parts[2])일"
    }

    private static func feelLabel(_ score: Int) -> String {
        switch score {
        case 1:
            return "매우 추움"
        case 2:
            return "추움"
        case 3:
            return "선선함"
        case 5:
            return "따뜻함"
        case 6:
            return "더움"
        case 7:
            return "매우 더움"
        default:
            return "적당함"
        }
    }

    private static func averageFeelLabel(entries: [FeedbackEntryNative]) -> String {
        guard !entries.isEmpty else { return "0/7" }
        let total = entries.reduce(0) { $0 + $1.feelScore }
        let average = Double(total) / Double(entries.count)
        return String(format: "%.1f/7", average)
    }

    private static func distinctRecordedDays(entries: [FeedbackEntryNative]) -> Int {
        Set(entries.map(\.feedbackDate)).count
    }
}

private struct HistoryRecord: Identifiable {
    let id = UUID()
    let date: String
    let slot: String
    let feel: String
    let outfit: String
}

private struct ComfortChart: View {
    let entries: [FeedbackEntryNative]

    private var chartRows: [(label: String, value: CGFloat)] {
        let grouped = Dictionary(grouping: entries, by: \.feedbackDate)
        let sortedDates = grouped.keys.sorted().suffix(7)
        return sortedDates.map { date in
            let dayEntries = grouped[date] ?? []
            let average = dayEntries.isEmpty
                ? 0
                : Double(dayEntries.reduce(0) { $0 + $1.feelScore }) / Double(dayEntries.count)
            return (label: Self.shortDate(date), value: CGFloat(max(0.05, min(1, average / 7.0))))
        }
    }

    private var points: [CGFloat] {
        let values = chartRows.map(\.value)
        return values.isEmpty ? [0.05] : values
    }

    var body: some View {
        VStack(spacing: PWSTokens.spacing12) {
            GeometryReader { proxy in
                let width = proxy.size.width
                let height = proxy.size.height
                Path { path in
                    for index in points.indices {
                        let x = width * CGFloat(index) / CGFloat(max(points.count - 1, 1))
                        let y = height * (1 - points[index])
                        if index == 0 {
                            path.move(to: CGPoint(x: x, y: y))
                        } else {
                            path.addLine(to: CGPoint(x: x, y: y))
                        }
                    }
                }
                .stroke(PWSTokens.secondaryText, style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))

                ForEach(points.indices, id: \.self) { index in
                    Circle()
                        .fill(PWSTokens.secondaryText)
                        .frame(width: 6, height: 6)
                        .position(
                            x: width * CGFloat(index) / CGFloat(max(points.count - 1, 1)),
                            y: height * (1 - points[index])
                        )
                }
            }
            .frame(height: 170)

            HStack {
                ForEach(chartRows.map(\.label), id: \.self) { label in
                    Text(label)
                        .font(.system(size: 11))
                        .foregroundStyle(PWSTokens.tertiaryText)
                        .frame(maxWidth: .infinity)
                }
                if chartRows.isEmpty {
                    Text("기록 없음")
                        .font(.system(size: 11))
                        .foregroundStyle(PWSTokens.tertiaryText)
                        .frame(maxWidth: .infinity)
                }
            }
        }
    }

    private static func shortDate(_ value: String) -> String {
        let parts = value.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return value }
        return "\(parts[1])/\(parts[2])"
    }
}

private struct CalendarMonthCard: View {
    let entries: [FeedbackEntryNative]

    private var calendarInfo: (title: String, days: [Int?], recorded: Set<Int>) {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .current
        calendar.firstWeekday = 1
        let now = Date()
        let components = calendar.dateComponents([.year, .month], from: now)
        let year = components.year ?? 2026
        let month = components.month ?? 1
        let date = calendar.date(from: DateComponents(year: year, month: month, day: 1)) ?? now
        let dayRange = calendar.range(of: .day, in: .month, for: date) ?? 1..<29
        let leadingEmptyDays = max(calendar.component(.weekday, from: date) - calendar.firstWeekday, 0)
        let prefix = String(format: "%04d-%02d-", year, month)
        let recorded = Set(entries.compactMap { entry -> Int? in
            guard entry.feedbackDate.hasPrefix(prefix) else { return nil }
            return Int(entry.feedbackDate.suffix(2))
        })
        let days = Array(repeating: nil, count: leadingEmptyDays) + Array(dayRange).map(Optional.some)
        return ("\(year)년 \(month)월", days, recorded)
    }

    var body: some View {
        let info = calendarInfo
        PWSStrictCard(radius: PWSTokens.radius) {
            HStack {
                Spacer()
                Text(info.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(PWSTokens.primaryText)
                Spacer()
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: PWSTokens.spacing8), count: 7), spacing: PWSTokens.spacing8) {
                ForEach(["일", "월", "화", "수", "목", "금", "토"], id: \.self) { weekday in
                    Text(weekday)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(PWSTokens.tertiaryText)
                }
                ForEach(Array(info.days.enumerated()), id: \.offset) { _, day in
                    if let day {
                        Text("\(day)")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(info.recorded.contains(day) ? .white : PWSTokens.primaryText)
                            .frame(width: 28, height: 28)
                            .background(info.recorded.contains(day) ? PWSTokens.blueGradient : LinearGradient(colors: [.clear], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .clipShape(Circle())
                    } else {
                        Color.clear.frame(width: 28, height: 28)
                    }
                }
            }
            HStack {
                Circle().fill(PWSTokens.gradientEnd).frame(width: 6, height: 6)
                Text("이번 달 \(info.recorded.count)일 기록됨")
                    .font(.system(size: 12))
                    .foregroundStyle(PWSTokens.secondaryText)
            }
            .frame(maxWidth: .infinity, alignment: .center)
        }
    }
}

private struct HistoryRecordCard: View {
    let record: HistoryRecord

    var body: some View {
        PWSStrictCard(radius: PWSTokens.compactRadius) {
            HStack {
                HStack(spacing: PWSTokens.spacing8) {
                    Text(record.date)
                        .font(.system(size: 14, weight: .semibold))
                    Text(record.slot)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(PWSTokens.secondaryText)
                        .padding(.horizontal, 10)
                        .frame(height: 24)
                        .background(PWSTokens.secondaryPanelBackground)
                        .clipShape(Capsule())
                }
                Spacer()
                Text(record.feel)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .frame(height: 28)
                    .background(PWSTokens.blueGradient)
                    .clipShape(Capsule())
            }
            Text(record.outfit)
                .font(.system(size: 14))
                .foregroundStyle(PWSTokens.secondaryText)
                .padding(.horizontal, PWSTokens.spacing12)
                .frame(maxWidth: .infinity, minHeight: 38, alignment: .leading)
                .background(PWSTokens.pageBackground)
                .clipShape(RoundedRectangle(cornerRadius: PWSTokens.smallRadius, style: .continuous))
        }
    }
}

private struct OutfitAnalysisCard: View {
    let entries: [FeedbackEntryNative]

    private var bestOutfit: String {
        let combinations = entries.compactMap { $0.clothingItems?.joined(separator: " + ") }
        return Dictionary(grouping: combinations, by: { $0 })
            .max { $0.value.count < $1.value.count }?
            .key ?? "기록 대기 중"
    }

    private var averageFeel: String {
        guard !entries.isEmpty else { return "0/7" }
        let total = entries.reduce(0) { $0 + $1.feelScore }
        return String(format: "%.1f/7", Double(total) / Double(entries.count))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing16) {
            Text("가장 쾌적했던 조합")
                .font(.system(size: 14))
                .foregroundStyle(.white.opacity(0.8))
            Text(bestOutfit)
                .font(.system(size: 24, weight: .bold))
            HStack(spacing: PWSTokens.spacing12) {
                Text(averageFeel)
                    .font(.system(size: 30, weight: .bold))
                Text(entries.isEmpty ? "기록을 저장하면\n분석이 시작됩니다" : "저장된 기록 기준\n평균 체감")
                    .font(.system(size: 14))
                    .lineSpacing(4)
            }
            .padding(PWSTokens.spacing16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.white.opacity(0.2))
            .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
        }
        .foregroundStyle(.white)
        .padding(PWSTokens.spacing24)
        .frame(maxWidth: .infinity, minHeight: 204, alignment: .leading)
        .background(LinearGradient(colors: [Color(red: 0, green: 0.73, blue: 0.65), Color(red: 0, green: 0.57, blue: 0.72)], startPoint: .topLeading, endPoint: .bottomTrailing))
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
        .shadow(color: .black.opacity(0.16), radius: 14, x: 0, y: 8)
    }
}
