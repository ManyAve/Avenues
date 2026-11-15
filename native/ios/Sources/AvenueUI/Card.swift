import SwiftUI

/// Avenue's Card (web `Card`, src/components/card.tsx): the card colour, the xl corner (14pt) and a hairline of the
/// foreground at 10%. `default` insets 16pt, `sm` 12pt, between its parts and around them.
///
///     Card {
///         CardHeader("Dues 2026", description: "Billed March 1") {
///             Button("Edit") { … }.buttonStyle(.avenue(.outline, size: .sm))
///         }
///         CardContent { Text("$240.00 per household") }
///     } footer: {
///         Button("Request dues") { … }.buttonStyle(.avenue)
///     }
///
/// The footer sits on a muted band under a hairline, flush with the card's bottom edge, as on the web.
public struct Card<Content: View, Footer: View>: View {
    public typealias Size = CardSize

    let size: Size
    let content: Content
    let footer: Footer?
    @Environment(\.colorScheme) private var scheme

    public init(size: Size = .default, @ViewBuilder content: () -> Content, @ViewBuilder footer: () -> Footer) {
        self.size = size
        self.content = content()
        self.footer = footer()
    }

    public var body: some View {
        let c = AvenueColors(scheme)
        let spacing = size.spacing
        let shape = RoundedRectangle(cornerRadius: CGFloat(AvenueTokens.Radius.xl), style: .continuous)
        VStack(alignment: .leading, spacing: spacing) {
            content
            if let footer {
                footer
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(spacing)
                    .background(c.muted.opacity(0.5))
                    .overlay(alignment: .top) { Rectangle().fill(c.border).frame(height: 1) }
            }
        }
        .padding(.top, spacing)
        .padding(.bottom, footer == nil ? spacing : 0)
        .frame(maxWidth: .infinity, alignment: .leading)
        .avenueText(.compact)
        .foregroundStyle(c.cardForeground)
        .background(c.card, in: shape)
        .clipShape(shape)
        .overlay { shape.strokeBorder(c.foreground.opacity(0.1), lineWidth: 1) }
        .environment(\.avenueCardSize, size)
        .accessibilityElement(children: .contain)
    }
}

public extension Card where Footer == EmptyView {
    init(size: Size = .default, @ViewBuilder content: () -> Content) {
        self.size = size
        self.content = content()
        self.footer = nil
    }
}

/// A card's size: `default` insets 16pt, `sm` 12pt.
public enum CardSize: String, Sendable, CaseIterable {
    case `default`, sm

    var spacing: CGFloat { self == .sm ? 12 : CGFloat(AvenueTokens.Spacing.inset) }
}

private struct AvenueCardSizeKey: EnvironmentKey {
    static let defaultValue: CardSize = .default
}

extension EnvironmentValues {
    /// The enclosing card's size, so its parts inset to match without being told.
    var avenueCardSize: CardSize {
        get { self[AvenueCardSizeKey.self] }
        set { self[AvenueCardSizeKey.self] = newValue }
    }
}

/// A card's title, its optional description under it, and an optional action on the title's line, centred on it and
/// 8pt from the title (web `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`). Controls in a header use the
/// sm size and are never pills. VoiceOver can reach the title with the headings rotor.
public struct CardHeader<Action: View>: View {
    let title: String
    let description: String?
    let action: Action
    @Environment(\.avenueCardSize) private var size
    @Environment(\.colorScheme) private var scheme

    public init(_ title: String, description: String? = nil, @ViewBuilder action: () -> Action) {
        self.title = title
        self.description = description
        self.action = action()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: CGFloat(AvenueTokens.Spacing.inline)) {
            HStack(spacing: CGFloat(AvenueTokens.Spacing.group)) {
                Text(title)
                    .avenueText(.compact, weight: .medium)
                    .accessibilityAddTraits(.isHeader)
                    .frame(maxWidth: .infinity, alignment: .leading)
                action
            }
            if let description {
                Text(description)
                    .avenueText(.compact)
                    .foregroundStyle(AvenueColors(scheme).mutedForeground)
            }
        }
        .padding(.horizontal, size.spacing)
    }
}

public extension CardHeader where Action == EmptyView {
    init(_ title: String, description: String? = nil) {
        self.init(title, description: description) { EmptyView() }
    }
}

/// A card's body, inset from its sides (web `CardContent`).
public struct CardContent<Content: View>: View {
    let content: Content
    @Environment(\.avenueCardSize) private var size

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, size.spacing)
    }
}
