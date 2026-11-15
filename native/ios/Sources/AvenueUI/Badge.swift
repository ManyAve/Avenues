import SwiftUI

/// Avenue's Badge (web `Badge`, src/components/badge.tsx): a 20pt pill of `text-meta`, medium, 8pt each side (4pt on
/// the icon's side). It labels; it isn't a control. For a status with meaning use `Status`.
public struct Badge: View {
    public enum Variant: String, Sendable, CaseIterable {
        case `default`, secondary, destructive, outline
    }

    let title: String
    let systemImage: String?
    let variant: Variant
    @ScaledMetric(relativeTo: .subheadline) private var height: CGFloat = 20
    @ScaledMetric(relativeTo: .subheadline) private var iconSize: CGFloat = 12
    @Environment(\.colorScheme) private var scheme

    public init(_ title: String, systemImage: String? = nil, variant: Variant = .default) {
        self.title = title
        self.systemImage = systemImage
        self.variant = variant
    }

    public var body: some View {
        let c = AvenueColors(scheme)
        HStack(spacing: CGFloat(AvenueTokens.Spacing.inline)) {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: iconSize, weight: .medium))
                    .accessibilityHidden(true)
            }
            Text(title).lineLimit(1)
        }
        .avenueText(.meta, weight: .medium)
        .padding(.leading, systemImage == nil ? 8 : 4)
        .padding(.trailing, 8)
        .frame(minHeight: height)
        .foregroundStyle(foreground(c))
        .background(fill(c), in: Capsule())
        .overlay {
            if variant == .outline { Capsule().strokeBorder(c.border, lineWidth: 1) }
        }
        .fixedSize()
        .accessibilityElement(children: .combine)
    }

    private func foreground(_ c: AvenueColors) -> Color {
        switch variant {
        case .default: c.primaryForeground
        case .secondary: c.secondaryForeground
        case .destructive: c.destructiveSubtleForeground
        case .outline: c.foreground
        }
    }

    private func fill(_ c: AvenueColors) -> Color {
        switch variant {
        case .default: c.primary
        case .secondary: c.secondary
        case .destructive: c.destructive.opacity(scheme == .dark ? 0.2 : 0.1)
        case .outline: .clear
        }
    }
}
