import SwiftUI

struct OutfitGuideCard: View {
    let tempC: Double
    
    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing16) {
            Text("오늘의 추천 옷차림")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.white)
            
            HStack(spacing: PWSTokens.spacing16) {
                if let outfitImage = UIImage(named: outfitAssetName) {
                    Image(uiImage: outfitImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 100, height: 100)
                        .background(Color.white.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                } else {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.1))
                        .frame(width: 100, height: 100)
                        .overlay(Image(systemName: "tshirt").font(.largeTitle).foregroundStyle(.white))
                }
                
                VStack(alignment: .leading, spacing: 8) {
                    Text(outfitDescription)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                    Text("현재 기온에 맞춘 코디입니다.")
                        .font(.system(size: 13))
                        .foregroundStyle(.white.opacity(0.7))
                }
                Spacer()
            }
        }
        .padding(PWSTokens.spacing20)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
    }
    
    private var outfitAssetName: String {
        switch tempC {
        case ..<5: return "avatar_outfit_winter_padding"
        case 5..<13: return "avatar_outfit_winter_coat"
        case 13..<23: return "avatar_outfit_spring_cardigan"
        case 23..<30: return "avatar_outfit_spring_light"
        default: return "avatar_outfit_summer_light"
        }
    }
    
    private var outfitDescription: String {
        switch tempC {
        case ..<5: return "매우 춥습니다. 든든한 패딩과 방한 용품을 꼭 챙기세요."
        case 5..<13: return "쌀쌀한 날씨입니다. 따뜻한 코트나 두꺼운 자켓이 좋습니다."
        case 13..<23: return "선선합니다. 가벼운 가디건이나 얇은 자켓을 걸치세요."
        case 23..<30: return "따뜻한 날씨입니다. 가벼운 긴팔이나 얇은 셔츠가 적당합니다."
        default: return "무더운 날씨입니다. 시원한 반팔과 반바지를 추천합니다."
        }
    }
}
