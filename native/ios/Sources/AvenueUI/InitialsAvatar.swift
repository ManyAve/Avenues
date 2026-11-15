import SwiftUI

/// Avenue's decorative tints (web `tints`, src/lib/format.ts), in the web's order. They carry no status meaning.
public enum AvenueTint: String, Sendable, CaseIterable {
    case teal, plum, stone, iris

    /// The tint for a key, by the web's stable FNV-1a hash (`tintFor`), so a person keeps one colour on every screen
    /// and on every platform. Hashes the first UTF-16 unit of each code point, as the web's `charCodeAt(0)` does.
    public static func of(_ key: String) -> AvenueTint {
        var h: UInt32 = 2_166_136_261
        for scalar in key.unicodeScalars {
            h ^= UInt32(String(scalar).utf16.first!)
            h = h &* 16_777_619
        }
        return allCases[Int(h % UInt32(allCases.count))]
    }

    /// The tint's background, text and solid colours in a colour scheme.
    public func colors(_ scheme: ColorScheme) -> (bg: Color, fg: Color, solid: Color) {
        let t = AvenueColors(scheme).tokens
        let (bg, fg, solid) = switch self {
        case .teal: (t.tintTealBg, t.tintTealFg, t.tintTealSolid)
        case .plum: (t.tintPlumBg, t.tintPlumFg, t.tintPlumSolid)
        case .stone: (t.tintStoneBg, t.tintStoneFg, t.tintStoneSolid)
        case .iris: (t.tintIrisBg, t.tintIrisFg, t.tintIrisSolid)
        }
        return (Color(avenueHex: bg), Color(avenueHex: fg), Color(avenueHex: solid))
    }
}

/// The initials Avenue shows for a name (web `initials`): the first letter of the first two words that start with a
/// letter, in any script, upper-cased. "Avery Quinn" is "AQ"; "  émile 3rd zola" is "ÉZ".
public func avenueInitials(_ name: String) -> String {
    var letters: [Character] = []
    for word in name.split(whereSeparator: { $0.isWhitespace }) {
        guard let first = word.unicodeScalars.first, first.properties.isAlphabetic, Character(first).isLetter else { continue }
        letters.append(Character(first))
        if letters.count == 2 { break }
    }
    return String(letters).uppercased()
}

/// Avenue's tinted-initials avatar (web `InitialsAvatar`, src/components/initials-avatar.tsx): sm 28pt and default
/// 32pt, the tint picked from `tintKey` (pass the person's stable id, so one person keeps one colour even when their
/// name is written differently), falling back to the name.
///
/// VoiceOver reads the name, not the initials. When the name is shown beside the avatar, pass `decorative` so it is
/// read once.
public struct InitialsAvatar: View {
    public enum Size: String, Sendable, CaseIterable {
        case sm, `default`

        var points: CGFloat { self == .sm ? 28 : 32 }
    }

    let name: String
    let tintKey: String?
    let size: Size
    let decorative: Bool
    @Environment(\.colorScheme) private var scheme

    public init(name: String, tintKey: String? = nil, size: Size = .sm, decorative: Bool = false) {
        self.name = name
        self.tintKey = tintKey
        self.size = size
        self.decorative = decorative
    }

    public var body: some View {
        let tint = AvenueTint.of(tintKey ?? name).colors(scheme)
        ZStack {
            Circle().fill(tint.bg)
            Text(avenueInitials(name))
                // A fixed size: the initials must fit their circle at any text size, and the name beside them grows.
                .font(.system(size: CGFloat(AvenueTokens.TypeScale.meta.size), weight: .semibold))
                .tracking(0.2)
                .foregroundStyle(tint.fg)
        }
        .frame(width: size.points, height: size.points)
        .accessibilityElement(children: .ignore)
        .modifier(AvatarAccessibility(name: name, decorative: decorative))
    }
}

private struct AvatarAccessibility: ViewModifier {
    let name: String
    let decorative: Bool

    func body(content: Content) -> some View {
        if decorative {
            content.accessibilityHidden(true)
        } else {
            content.accessibilityLabel(name).accessibilityAddTraits(.isImage)
        }
    }
}
