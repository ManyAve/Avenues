import SwiftUI

/// Avenue's Status (web `Status`, src/components/status.tsx): an outlined pill with a coloured dot, or with `filled`
/// a tinted pill. The words carry the meaning and the colour only repeats it, so a status always has a label.
/// 24pt tall, as the web's (its meta line, 1pt padding and a 1pt border), so a row of mixed statuses lines up.
///
/// The web's `help` (an info button beside the pill) has no counterpart yet: on a phone, put the explanation in the
/// row's detail screen.
public struct Status: View {
    public enum Tone: String, Sendable, CaseIterable {
        case success, warning, primary, info, neutral
    }

    let label: String
    let tone: Tone
    let filled: Bool
    @ScaledMetric(relativeTo: .subheadline) private var height: CGFloat = 24
    @Environment(\.colorScheme) private var scheme

    public init(_ label: String, tone: Tone, filled: Bool = false) {
        self.label = label
        self.tone = tone
        self.filled = filled
    }

    public var body: some View {
        let c = AvenueColors(scheme)
        let (bg, fg) = filled ? fills(c) : (c.background, c.mutedForeground)
        HStack(spacing: CGFloat(AvenueTokens.Spacing.inline)) {
            if !filled {
                Circle().fill(dot(c)).frame(width: 6, height: 6).accessibilityHidden(true)
            }
            Text(label).lineLimit(1)
        }
        .avenueText(.meta)
        .padding(.horizontal, 8)
        .frame(minHeight: height)
        .foregroundStyle(fg)
        .background(bg, in: Capsule())
        .overlay {
            if !filled { Capsule().strokeBorder(c.border, lineWidth: 1) }
        }
        .fixedSize()
        .accessibilityElement(children: .combine)
    }

    private func dot(_ c: AvenueColors) -> Color {
        switch tone {
        case .success: c.success
        case .warning: c.warning
        case .primary: c.primary
        case .info: c.info
        case .neutral: c.slateSubtleForeground
        }
    }

    private func fills(_ c: AvenueColors) -> (Color, Color) {
        switch tone {
        case .success: (c.successSubtle, c.successSubtleForeground)
        case .warning: (c.warningSubtle, c.warningSubtleForeground)
        case .primary: (c.primarySubtle, c.primarySubtleForeground)
        case .info: (c.infoSubtle, c.infoSubtleForeground)
        case .neutral: (c.slateSubtle, c.slateSubtleForeground)
        }
    }
}
