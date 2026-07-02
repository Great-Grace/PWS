import SwiftUI

// MARK: - Avatar Asset Resolver
// 에셋 파일명 → 이미지 로드 (에셋 없으면 emoji fallback)

enum AvatarPose: String, CaseIterable {
    case standing        = "avatar_pose_standing"
    case shivering       = "avatar_pose_shivering"
    case hugging         = "avatar_pose_hugging"
    case fanning         = "avatar_pose_fanning"
    case wiping          = "avatar_pose_wiping"
    case shieldRain      = "avatar_pose_shield_rain"
    case umbrella        = "avatar_pose_umbrella"
    case snowflake       = "avatar_pose_snowflake"
    case walking         = "avatar_pose_walking"
    case sleepy          = "avatar_pose_sleepy"
    case cheerful        = "avatar_pose_cheerful"
    case armsCrossed     = "avatar_pose_arms_crossed"
}

enum AvatarFace: String, CaseIterable {
    case neutral         = "avatar_face_neutral"
    case smile           = "avatar_face_smile"
    case coldPain        = "avatar_face_cold_pain"
    case hotPain         = "avatar_face_hot_pain"
    case sweating        = "avatar_face_sweating"
    case shiver          = "avatar_face_shiver"
    case yawn            = "avatar_face_yawn"
    case surprised       = "avatar_face_surprised"
    case comfortable     = "avatar_face_comfortable"
    case worried         = "avatar_face_worried"
}

enum AvatarOutfit: String, CaseIterable {
    case summerLight     = "avatar_outfit_summer_light"
    case summerCasual    = "avatar_outfit_summer_casual"
    case springLight     = "avatar_outfit_spring_light"
    case springCardigan  = "avatar_outfit_spring_cardigan"
    case fallJacket      = "avatar_outfit_fall_jacket"
    case fallCoat        = "avatar_outfit_fall_coat"
    case winterCoat      = "avatar_outfit_winter_coat"
    case winterPadding   = "avatar_outfit_winter_padding"
}

enum WeatherProp: String, CaseIterable {
    case umbrellaOpen    = "prop_umbrella_open"
    case rainDrops       = "prop_rain_drops"
    case snowflakes      = "prop_snowflakes"
    case sweatDrops      = "prop_sweat_drops"
    case breathCloud     = "prop_breath_cloud"
    case sunGlow         = "prop_sun_glow"
    case thunderBolt     = "prop_thunder_bolt"
    case fogMist         = "prop_fog_mist"
    case windLines       = "prop_wind_lines"
    case leaf            = "prop_leaf"
}

// MARK: - Asset Availability Check

struct AssetCatalog {
    /// 에셋이 존재하는지 확인 (Assets.xcassets에 있으면 true)
    static func hasAsset(_ name: String) -> Bool {
        UIImage(named: name) != nil
    }

    /// 에셋 이미지 로드 (없으면 nil)
    static func image(_ name: String) -> Image? {
        guard hasAsset(name) else { return nil }
        return Image(name)
    }
}

// MARK: - Weather Condition

enum WeatherCondition {
    case clear
    case cloudy
    case rainy
    case snowy
    case thunderstorm
    case fog

    static func from(code: Int) -> WeatherCondition {
        switch code {
        case 200...299: return .thunderstorm
        case 300...399: return .rainy
        case 500...599: return .rainy
        case 600...699: return .snowy
        case 700...799: return .fog
        case 801...802: return .cloudy
        case 803...899: return .cloudy
        default:        return .clear
        }
    }
}

// MARK: - Time Phase

enum AvatarTime: String {
    case dawn       // 05-07
    case morning    // 07-10
    case midday     // 10-14
    case afternoon  // 14-17
    case sunset     // 17-19
    case dusk       // 19-21
    case night      // 21-05

    static func from(hour: Double) -> AvatarTime {
        switch hour {
        case 5..<7:    return .dawn
        case 7..<10:   return .morning
        case 10..<14:  return .midday
        case 14..<17:  return .afternoon
        case 17..<19:  return .sunset
        case 19..<21:  return .dusk
        default:        return .night
        }
    }
}

// MARK: - Scene Configuration

struct WeatherSceneConfig {
    let skyName: String
    let pose: AvatarPose
    let face: AvatarFace
    let outfit: AvatarOutfit
    let props: [WeatherProp]
    let emoji: String          // fallback emoji
    let poseEmoji: String      // fallback pose emoji
    let outfitEmoji: String    // fallback outfit emoji
}

struct WeatherSceneResolver {

    static func resolve(hour: Double, tempC: Double, weatherCode: Int) -> WeatherSceneConfig {
        let time = AvatarTime.from(hour: hour)
        let condition = WeatherCondition.from(code: weatherCode)

        // 1. 하늘
        let skyName = "sky_\(time.rawValue)_\(condition.rawValue)"

        // 2. 포즈 (기온 + 날씨)
        let pose = resolvePose(tempC: tempC, condition: condition)

        // 3. 표정 (기온)
        let face = resolveFace(tempC: tempC, condition: condition)

        // 4. 옷차림 (기온)
        let outfit = resolveOutfit(tempC: tempC)

        // 5. 소품 (날씨)
        let props = resolveProps(condition: condition, tempC: tempC)

        // 6. Fallback emoji
        let emoji = resolveEmoji(tempC: tempC)
        let poseEmoji = resolvePoseEmoji(pose: pose)
        let outfitEmoji = resolveOutfitEmoji(outfit: outfit)

        return WeatherSceneConfig(
            skyName: skyName,
            pose: pose,
            face: face,
            outfit: outfit,
            props: props,
            emoji: emoji,
            poseEmoji: poseEmoji,
            outfitEmoji: outfitEmoji
        )
    }

    // MARK: - Pose Resolution

    private static func resolvePose(tempC: Double, condition: WeatherCondition) -> AvatarPose {
        switch condition {
        case .rainy:
            return tempC > 20 ? .shieldRain : .umbrella
        case .snowy:
            return tempC < 0 ? .shivering : .snowflake
        case .thunderstorm:
            return .shieldRain
        case .fog:
            return .armsCrossed
        case .cloudy:
            if tempC < 5 { return .shivering }
            if tempC > 28 { return .fanning }
            return .standing
        case .clear:
            if tempC < 5 { return .shivering }
            if tempC < 13 { return .armsCrossed }
            if tempC > 32 { return .wiping }
            if tempC > 25 { return .fanning }
            return .cheerful
        }
    }

    // MARK: - Face Resolution

    private static func resolveFace(tempC: Double, condition: WeatherCondition) -> AvatarFace {
        switch condition {
        case .thunderstorm:  return .worried
        case .rainy:         return tempC < 10 ? .coldPain : .surprised
        case .snowy:         return tempC < 0 ? .coldPain : .surprised
        case .fog:           return .neutral
        case .cloudy:
            if tempC < 5 { return .coldPain }
            if tempC > 30 { return .sweating }
            return .comfortable
        case .clear:
            if tempC < 5 { return .coldPain }
            if tempC < 15 { return .shiver }
            if tempC > 32 { return .hotPain }
            if tempC > 25 { return .sweating }
            return .smile
        }
    }

    // MARK: - Outfit Resolution

    private static func resolveOutfit(tempC: Double) -> AvatarOutfit {
        switch tempC {
        case ..<(-5):  return .winterPadding
        case -5..<3:   return .winterCoat
        case 3..<8:    return .fallCoat
        case 8..<13:   return .fallJacket
        case 13..<18:  return .springCardigan
        case 18..<25:  return .springLight
        case 25..<30:  return .summerLight
        default:        return .summerCasual
        }
    }

    // MARK: - Props Resolution

    private static func resolveProps(condition: WeatherCondition, tempC: Double) -> [WeatherProp] {
        var props: [WeatherProp] = []

        switch condition {
        case .rainy:
            props.append(.umbrellaOpen)
            props.append(.rainDrops)
        case .snowy:
            props.append(.snowflakes)
            if tempC < 5 { props.append(.breathCloud) }
        case .thunderstorm:
            props.append(.thunderBolt)
            props.append(.rainDrops)
        case .fog:
            props.append(.fogMist)
        case .cloudy:
            if tempC > 5 { props.append(.windLines) }
        case .clear:
            if tempC > 28 { props.append(.sweatDrops) }
            if tempC > 25 { props.append(.sunGlow) }
            if tempC < 5 { props.append(.breathCloud) }
            // 가을이면 낙엽 (9-11월)
            let month = Calendar.current.component(.month, from: Date())
            if month >= 9 && month <= 11 && tempC < 20 {
                props.append(.leaf)
            }
        }

        return props
    }

    // MARK: - Emoji Fallbacks

    private static func resolveEmoji(tempC: Double) -> String {
        switch tempC {
        case ..<5:    return "🥶"
        case 5..<13:  return "😊"
        case 13..<23: return "😌"
        case 23..<30: return "😅"
        default:       return "🥵"
        }
    }

    private static func resolvePoseEmoji(pose: AvatarPose) -> String {
        switch pose {
        case .shivering:    return "🥶"
        case .hugging:      return "🤗"
        case .fanning:      return "🪭"
        case .wiping:       return "😓"
        case .shieldRain:   return "🏃"
        case .umbrella:     return "☂️"
        case .snowflake:    return "❄️"
        case .walking:      return "🚶"
        case .sleepy:       return "😴"
        case .cheerful:     return "😄"
        case .armsCrossed:  return "🙅"
        case .standing:     return "🧍"
        }
    }

    private static func resolveOutfitEmoji(outfit: AvatarOutfit) -> String {
        switch outfit {
        case .summerLight:    return "👕"
        case .summerCasual:   return "🩳"
        case .springLight:    return "👔"
        case .springCardigan: return "🧥"
        case .fallJacket:     return "🧥"
        case .fallCoat:       return "🧥"
        case .winterCoat:     return "🧣"
        case .winterPadding:  return "🧥"
        }
    }
}
