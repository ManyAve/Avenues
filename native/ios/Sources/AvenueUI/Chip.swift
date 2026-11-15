import SwiftUI

/// Avenue's filter chip (web `Chip`, src/components/chip.tsx): a 32pt pill in a chip row, outlined and muted, that
/// turns "chosen" when selected (the primary border, the primary-subtle fill and its text) and shows a check before
/// its label, so colour never carries the state alone. An optional count follows the label. The tap area is 44pt.
///
/// VoiceOver reads a selected chip as "Selected", the iOS convention for a filter, and the count with the label.
///
///     Chip("Past due", count: 4, isSelected: $pastDue)
///     Chip("Paid", isSelected: filter == .paid) { filter = .paid }
public struct Chip: View {
    let title: String
    let count: Int?
    let systemImage: String?
    let isSelected: Bool
    let action: () -> Void
    @ScaledMetric(relativeTo: .subheadline) private var height: CGFloat = CGFloat(AvenueTokens.Spacing.controlMd)
    @ScaledMetric(relativeTo: .subheadline) private var iconSize: CGFloat = 16
    @Environment(\.colorScheme) private var scheme
    @Environment(\.isEnabled) private var isEnabled

    /// A chip that toggles on its own, as the web's `pressed`.
    public init(_ title: String, count: Int? = nil, systemImage: String? = nil, isSelected: Binding<Bool>) {
        self.init(title, count: count, systemImage: systemImage, isSelected: isSelected.wrappedValue) {
            isSelected.wrappedValue.toggle()
        }
    }

    /// A chip whose selection the caller keeps, such as one choice out of a row.
    public init(_ title: String, count: Int? = nil, systemImage: String? = nil, isSelected: Bool, action: @escaping () -> Void) {
        self.title = title
        self.count = count
        self.systemImage = systemImage
        self.isSelected = isSelected
        self.action = action
    }

    public var body: some View {
        let c = AvenueColors(scheme)
        Button(action: action) {
            HStack(spacing: CGFloat(AvenueTokens.Spacing.inline)) {
                if isSelected {
                    Image(systemName: "checkmark").font(.system(size: iconSize * 0.8, weight: .semibold))
                        .frame(width: iconSize, height: iconSize)
                } else if let systemImage {
                    Image(systemName: systemImage).font(.system(size: iconSize * 0.85)).frame(width: iconSize, height: iconSize)
                }
                Text(title)
                if let count { Text("\(count)").monospacedDigit().opacity(0.8) }
            }
            .avenueText(.control)
            .lineLimit(1)
            .padding(.horizontal, 8)
            .frame(minHeight: height)
            .foregroundStyle(isSelected ? c.primarySubtleForeground : c.mutedForeground)
            .background(isSelected ? c.primarySubtle : c.background, in: Capsule())
            .overlay { Capsule().strokeBorder(isSelected ? c.primary : c.border, lineWidth: 1) }
            .opacity(isEnabled ? 1 : 0.5)
            .contentShape(Rectangle().inset(by: -hitOutset(height)))
        }
        .buttonStyle(ChipPressStyle())
        .fixedSize()
        .accessibilityLabel(count.map { "\(title), \($0)" } ?? title)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

private struct ChipPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.opacity(configuration.isPressed ? 0.7 : 1)
    }
}

/// A row of chips (web `ChipRow`). `wrap` (the default) wraps onto more lines; `scroll` keeps one line for a phone
/// filter bar, scrolling sideways and snapping to a chip. Chips never shrink or truncate. 16pt between chips
/// (`Spacing.controls`), the room two tap targets need on a phone.
///
/// In `scroll`, set the row's side margin with `.contentMargins(.horizontal, 16, for: .scrollContent)` so the first
/// chip lines up with the page while the row still scrolls to the screen edge.
public struct ChipRow<Content: View>: View {
    public enum Overflow: String, Sendable { case wrap, scroll }

    let overflow: Overflow
    let content: Content

    public init(overflow: Overflow = .wrap, @ViewBuilder content: () -> Content) {
        self.overflow = overflow
        self.content = content()
    }

    public var body: some View {
        let gap = CGFloat(AvenueTokens.Spacing.controls)
        switch overflow {
        case .wrap:
            FlowLayout(spacing: gap) { content }
        case .scroll:
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: gap) { content }
                    .scrollTargetLayout()
                    // Room for the chips' 44pt tap areas above and below, as the web's scrolling row pads 8px.
                    .padding(.vertical, CGFloat(AvenueTokens.Spacing.group))
            }
            .scrollTargetBehavior(.viewAligned)
        }
    }
}

/// Lays its views out left to right, wrapping onto a new line when the next one doesn't fit.
struct FlowLayout: Layout {
    var spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = arrange(width: proposal.width ?? .infinity, subviews: subviews)
        let width = rows.map(\.width).max() ?? 0
        let height = rows.map(\.height).reduce(0, +) + spacing * CGFloat(max(0, rows.count - 1))
        return CGSize(width: proposal.width.map { min($0, width) } ?? width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var y = bounds.minY
        for row in arrange(width: bounds.width, subviews: subviews) {
            var x = bounds.minX
            for index in row.indices {
                let size = subviews[index].sizeThatFits(.unspecified)
                subviews[index].place(at: CGPoint(x: x, y: y + (row.height - size.height) / 2), proposal: ProposedViewSize(size))
                x += size.width + spacing
            }
            y += row.height + spacing
        }
    }

    private struct Row { var indices: [Int] = []; var width: CGFloat = 0; var height: CGFloat = 0 }

    private func arrange(width: CGFloat, subviews: Subviews) -> [Row] {
        var rows: [Row] = [Row()]
        for index in subviews.indices {
            let size = subviews[index].sizeThatFits(.unspecified)
            let gap = rows[rows.count - 1].indices.isEmpty ? 0 : spacing
            if rows[rows.count - 1].width + gap + size.width > width, !rows[rows.count - 1].indices.isEmpty {
                rows.append(Row())
            }
            let last = rows.count - 1
            rows[last].width += (rows[last].indices.isEmpty ? 0 : spacing) + size.width
            rows[last].height = max(rows[last].height, size.height)
            rows[last].indices.append(index)
        }
        return rows.filter { !$0.indices.isEmpty }
    }
}
