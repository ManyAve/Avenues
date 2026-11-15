import SwiftUI

/// Avenue's colour roles for one colour scheme, as SwiftUI colours: `colors.primary`, `colors.mutedForeground`.
/// The names are the web's (`--muted-foreground` is `mutedForeground`). Every component reads the scheme from the
/// environment, so the roles follow light and dark mode without any setup.
@dynamicMemberLookup
public struct AvenueColors: Sendable {
    public let scheme: ColorScheme

    public init(_ scheme: ColorScheme) {
        self.scheme = scheme
    }

    /// The raw sRGB values of this scheme's roles.
    public var tokens: AvenueTokens.Colors { scheme == .dark ? AvenueTokens.dark : AvenueTokens.light }

    public subscript(dynamicMember role: KeyPath<AvenueTokens.Colors, UInt32>) -> Color {
        Color(avenueHex: tokens[keyPath: role])
    }
}

public extension Color {
    /// An sRGB colour from `0xRRGGBB`, as the tokens store it.
    init(avenueHex hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

/// A step of Avenue's type scale at phone values (`--text-*`). `field` is the web's `text-field`: a form field's
/// text and its messages, `compact` (16pt) on a phone, so iOS never zooms and a message matches its field.
public enum AvenueTextStep: Sendable, CaseIterable {
    case meta, compact, control, field, post, title, heading, display

    var step: AvenueTokens.TextStep {
        switch self {
        case .meta: AvenueTokens.TypeScale.meta
        case .compact, .field: AvenueTokens.TypeScale.compact
        case .control: AvenueTokens.TypeScale.control
        case .post: AvenueTokens.TypeScale.post
        case .title: AvenueTokens.TypeScale.title
        case .heading: AvenueTokens.TypeScale.heading
        case .display: AvenueTokens.TypeScale.display
        }
    }

    /// The system text style each step grows with under Dynamic Type: the nearest one by default size.
    public var textStyle: Font.TextStyle {
        switch self {
        case .meta, .control: .subheadline
        case .compact, .field: .body
        case .post, .title: .title3
        case .heading: .title2
        case .display: .largeTitle
        }
    }

    public var size: CGFloat { CGFloat(step.size) }
    public var lineHeight: CGFloat { CGFloat(step.lineHeight) }
}

public extension View {
    /// Sets text in an Avenue type step, with its line height. Both grow with the person's text size (Dynamic Type),
    /// following the step's text style; at the default size they are the tokens' points.
    func avenueText(_ step: AvenueTextStep, weight: Font.Weight = .regular, monospaced: Bool = false) -> some View {
        modifier(AvenueTextModifier(step: step, weight: weight, monospaced: monospaced))
    }

    /// Avenue's look for the stock controls under this view: the primary colour as the tint, so system toggles,
    /// pickers, links and navigation buttons take Avenue's purple. The Avenue components need no setup.
    func avenueTheme() -> some View { modifier(AvenueThemeModifier()) }
}

private struct AvenueTextModifier: ViewModifier {
    let weight: Font.Weight
    let monospaced: Bool
    @ScaledMetric private var size: CGFloat
    @ScaledMetric private var lineHeight: CGFloat

    init(step: AvenueTextStep, weight: Font.Weight, monospaced: Bool) {
        self.weight = weight
        self.monospaced = monospaced
        _size = ScaledMetric(wrappedValue: step.size, relativeTo: step.textStyle)
        _lineHeight = ScaledMetric(wrappedValue: step.lineHeight, relativeTo: step.textStyle)
    }

    func body(content: Content) -> some View {
        content
            .font(.system(size: size, weight: weight, design: monospaced ? .monospaced : .default))
            .lineSpacing(max(0, lineHeight - size * 1.2))
    }
}

private struct AvenueThemeModifier: ViewModifier {
    @Environment(\.colorScheme) private var scheme

    func body(content: Content) -> some View {
        content.tint(AvenueColors(scheme).primary)
    }
}

/// The padding that grows a control's tap area to `touchMinimum` (44pt) without growing what is drawn, as the web's
/// `hit-area`. Used with `contentShape`.
func hitOutset(_ drawn: CGFloat) -> CGFloat {
    max(0, (CGFloat(AvenueTokens.touchMinimum) - drawn) / 2)
}

public extension AvenueColors {
    /// `role` with `amount` (0...1) of `other` mixed in, as CSS `color-mix` in sRGB.
    func mix(_ role: KeyPath<AvenueTokens.Colors, UInt32>, _ other: KeyPath<AvenueTokens.Colors, UInt32>, _ amount: Double) -> Color {
        let a = tokens[keyPath: role], b = tokens[keyPath: other]
        func channel(_ shift: UInt32) -> Double {
            let x = Double((a >> shift) & 0xFF), y = Double((b >> shift) & 0xFF)
            return (x + (y - x) * amount) / 255
        }
        return Color(.sRGB, red: channel(16), green: channel(8), blue: channel(0), opacity: 1)
    }
}
