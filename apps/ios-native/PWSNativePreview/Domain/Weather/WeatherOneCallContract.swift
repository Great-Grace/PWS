import Foundation

struct WeatherOneCallContract {
    func endpoint(supabaseURL: String) throws -> URL {
        let trimmed = supabaseURL.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard !trimmed.isEmpty, let url = URL(string: "\(trimmed)/functions/v1/weather-onecall") else {
            throw ContractError.missingSupabaseURL
        }
        return url
    }

    func requestBody(latitude: Double, longitude: Double) -> Data {
        let body = String(format: #"{"lat":%.6f,"lng":%.6f}"#, locale: Locale(identifier: "en_US_POSIX"), latitude, longitude)
        return Data(body.utf8)
    }

    func headers(anonKey: String, accessToken: String) throws -> [String: String] {
        let normalizedAnonKey = anonKey.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedToken = accessToken.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedAnonKey.isEmpty else { throw ContractError.missingAnonKey }
        guard !normalizedToken.isEmpty else { throw ContractError.missingAccessToken }
        return [
            "Content-Type": "application/json",
            "Accept": "application/json",
            "apikey": normalizedAnonKey,
            "Authorization": "Bearer \(normalizedToken)",
            "x-client-info": "pws-native-ios"
        ]
    }
}

enum ContractError: Error, Equatable {
    case missingSupabaseURL
    case missingAnonKey
    case missingAccessToken
}

