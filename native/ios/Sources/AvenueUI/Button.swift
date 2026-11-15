import SwiftUI

/// Avenue's Button (web `Button`, src/components/button.tsx) as a SwiftUI button style:
///
///     Button("Record payment") { … }.buttonStyle(.avenue)
///     Button("Export") { … }.buttonStyle(.avenue(.outline, size: .sm))
///
/// The same variants and sizes as the web. Drawn heights are the phone control heights (`Spacing.control*`) and grow
/// with Dynamic Type; the tap area is at least 44pt either way, without growing what is drawn (the web's `hit-area`).
/// Buttons are never pills: xs and sm take the md corner (8pt), default and lg the lg corner (10pt). Pressing dims the
/// fill as the web's hover does; a disabled button is at half opacity. The label is `text-control`, medium.
public struct AvenueButtonStyle: ButtonStyle {
    public enum Variant: String, Sendable, CaseIterable {
        case `default`, outline, secondary, ghost, destructive, link
    }

    public enum Size: String, Sendable, CaseIterable {
        case xs, sm, `default`, lg, icon, iconXs, iconSm, iconLg

        var height: CGFloat {
            switch self {
            case .xs, .iconXs: CGFloat(AvenueTokens.Spacing.controlXs)
            case .sm, .iconSm: CGFloat(AvenueTokens.Spacing.controlSm)
            case .default, .icon: CGFloat(AvenueTokens.Spacing.controlMd)
            case .lg, .iconLg: CGFloat(AvenueTokens.Spacing.controlLg)
            }
        }

        var radius: CGFloat {
            switch self {
            case .xs, .sm, .iconXs, .iconSm: CGFloat(AvenueTokens.Radius.md)
            case .default, .lg, .icon, .iconLg: CGFloat(AvenueTokens.Radius.lg)
            }
        }

        var isIcon: Bool { [.icon, .iconXs, .iconSm, .iconLg].contains(self) }

        var paddingX: CGFloat {
            switch self {
            case .xs, .sm: 8
            case .default, .lg: 12
            case .icon, .iconXs, .iconSm, .iconLg: 0
            }
        }

        var iconSize: CGFloat {
            switch self {
            case .xs, .iconXs: 12
            case .sm: 14
            default: 16
            }
        }
    }

    public var variant: Variant
    public var size: Size
    /// Fills the width it is offered, as the web's `w-full`: a sheet's one primary action, for example.
    public var fullWidth: Bool

    public init(_ variant: Variant = .default, size: Size = .default, fullWidth: Bool = false) {
        self.variant = variant
        self.size = size
        self.fullWidth = fullWidth
    }

    public func makeBody(configuration: Configuration) -> some View {
        AvenueButtonBody(configuration: configuration, variant: variant, size: size, fullWidth: fullWidth)
    }
}

public extension ButtonStyle where Self == AvenueButtonStyle {
    /// Avenue's default (primary) button.
    static var avenue: AvenueButtonStyle { AvenueButtonStyle() }

    /// An Avenue button of the given variant and size.
    static func avenue(_ variant: AvenueButtonStyle.Variant = .default, size: AvenueButtonStyle.Size = .default, fullWidth: Bool = false) -> AvenueButtonStyle {
        AvenueButtonStyle(variant, size: size, fullWidth: fullWidth)
    }
}

private struct AvenueButtonBody: View {
    let configuration: ButtonStyleConfiguration
    let variant: AvenueButtonStyle.Variant
    let size: AvenueButtonStyle.Size
    let fullWidth: Bool
    @ScaledMetric private var height: CGFloat
    @ScaledMetric private var iconSize: CGFloat
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.colorScheme) private var scheme

    init(configuration: ButtonStyleConfiguration, variant: AvenueButtonStyle.Variant, size: AvenueButtonStyle.Size, fullWidth: Bool) {
        self.configuration = configuration
        self.variant = variant
        self.size = size
        self.fullWidth = fullWidth
        _height = ScaledMetric(wrappedValue: size.height, relativeTo: .subheadline)
        _iconSize = ScaledMetric(wrappedValue: size.iconSize, relativeTo: .subheadline)
    }

    var body: some View {
        let c = AvenueColors(scheme)
        let pressed = configuration.isPressed
        let shape = RoundedRectangle(cornerRadius: size.radius, style: .continuous)
        configuration.label
            .labelStyle(AvenueButtonLabelStyle(iconSize: iconSize, iconOnly: size.isIcon))
            .avenueText(.control, weight: .medium)
            .lineLimit(1)
            .padding(.horizontal, size.paddingX)
            .frame(minWidth: size.isIcon ? height : nil, maxWidth: fullWidth ? .infinity : nil, minHeight: height)
            .foregroundStyle(foreground(c))
            .background(fill(c, pressed: pressed), in: shape)
            .overlay {
                if variant == .outline { shape.strokeBorder(c.border, lineWidth: 1) }
            }
            .opacity(isEnabled ? (variant == .link && pressed ? 0.7 : 1) : 0.5)
            .contentShape(Rectangle().inset(by: -hitOutset(height)))
            .animation(.easeOut(duration: 0.12), value: pressed)
    }

    private func foreground(_ c: AvenueColors) -> Color {
        switch variant {
        case .default: c.primaryForeground
        case .outline, .ghost: c.foreground
        case .secondary: c.secondaryForeground
        case .destructive: c.destructiveSubtleForeground
        // Dark: the primary text colour is 3.2:1 on the dark page, so links use the subtle-foreground tone (4.5:1+).
        case .link: scheme == .dark ? c.primarySubtleForeground : c.primary
        }
    }

    private func fill(_ c: AvenueColors, pressed: Bool) -> Color {
        let dark = scheme == .dark
        switch variant {
        case .default: return c.primary.opacity(pressed ? 0.8 : 1)
        case .outline: return pressed ? c.muted : c.background
        case .secondary: return pressed ? c.mix(\.secondary, \.foreground, 0.05) : c.secondary
        case .ghost: return pressed ? (dark ? c.muted.opacity(0.5) : c.muted) : .clear
        case .destructive: return c.destructive.opacity(dark ? (pressed ? 0.3 : 0.2) : (pressed ? 0.2 : 0.1))
        case .link: return .clear
        }
    }
}

/// A `Label` inside an Avenue button: the icon at the size's icon size, 4pt from the words; only the icon for the
/// icon sizes (the title stays the accessible name).
private struct AvenueButtonLabelStyle: LabelStyle {
    let iconSize: CGFloat
    let iconOnly: Bool

    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 4) {
            configuration.icon
                .font(.system(size: iconSize, weight: .medium))
                .frame(width: iconSize, height: iconSize)
            if !iconOnly { configuration.title }
        }
    }
}

public extension View {
    /// Why this control is unavailable, as the web Button's `disabledReason`: disables it, shows the reason as one
    /// muted line under it, and gives VoiceOver the reason as the control's hint, so it is read with the control. A
    /// disabled button stays in the VoiceOver order on iOS, so the reason is never out of reach. `nil` changes nothing.
    @ViewBuilder
    func disabledReason(_ reason: String?) -> some View {
        if let reason {
            VStack(alignment: .leading, spacing: CGFloat(AvenueTokens.Spacing.inline)) {
                self.disabled(true).accessibilityHint(reason)
                DisabledReasonText(reason)
            }
        } else {
            self
        }
    }
}

private struct DisabledReasonText: View {
    let text: String
    @Environment(\.colorScheme) private var scheme

    init(_ text: String) { self.text = text }

    var body: some View {
        Text(text)
            .avenueText(.meta)
            .foregroundStyle(AvenueColors(scheme).mutedForeground)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityHidden(true)
    }
}
