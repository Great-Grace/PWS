import SwiftUI

struct HomeScreen: View {
    let environment: AppEnvironment

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing) {
            Text("PWS Native")
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(PWSTokens.primaryText)
            Text("Figma strict-copy baseline and backend contracts are ready for SwiftUI parity work.")
                .font(.body)
                .foregroundStyle(PWSTokens.secondaryText)
            VStack(alignment: .leading, spacing: 8) {
                Text("Preview bundle")
                    .font(.caption)
                    .foregroundStyle(PWSTokens.secondaryText)
                Text("com.wxxtae.pws.nativepreview.ios")
                    .font(.callout)
                    .foregroundStyle(PWSTokens.primaryText)
            }
            .padding(PWSTokens.spacing)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(PWSTokens.panelBackground)
            .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius))
            Spacer()
        }
        .padding(PWSTokens.spacing)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(PWSTokens.pageBackground)
    }
}

