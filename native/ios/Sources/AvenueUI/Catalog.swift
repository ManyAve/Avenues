import SwiftUI

/// Every component in each of its states, with fictional data: the views the screenshot test renders for Storybook,
/// where each one sits beside the web component and the Android one showing the same thing (`Native/*` stories).
/// Each slug matches a web story and an Android screenshot of the same name. Apps can show these in a debug screen.
public enum AvenueCatalog {
    public static let slugs = [
        "button-variants", "button-sizes", "button-disabled-reason",
        "badge-variants",
        "status-tones", "status-filled",
        "chip-states", "chip-row",
        "initials-avatar-sizes",
        "card-default", "card-sm",
        "inline-message-tones",
    ]

    /// The catalog view for a slug, on the page background with the page's 16pt margin.
    @MainActor @ViewBuilder
    public static func view(_ slug: String) -> some View {
        CatalogPage { content(slug) }
    }

    @MainActor @ViewBuilder
    static func content(_ slug: String) -> some View {
        switch slug {
        case "button-variants":
            VStack(alignment: .leading, spacing: 16) {
                Button("Record payment") {}.buttonStyle(.avenue)
                Button("Export") {}.buttonStyle(.avenue(.outline))
                Button("Add note") {}.buttonStyle(.avenue(.secondary))
                Button("Skip") {}.buttonStyle(.avenue(.ghost))
                Button("Delete") {}.buttonStyle(.avenue(.destructive))
                Button("View history") {}.buttonStyle(.avenue(.link))
            }
        case "button-sizes":
            VStack(alignment: .leading, spacing: 16) {
                Button("Extra small") {}.buttonStyle(.avenue(size: .xs))
                Button("Small") {}.buttonStyle(.avenue(size: .sm))
                Button("Default") {}.buttonStyle(.avenue(size: .default))
                Button("Large") {}.buttonStyle(.avenue(size: .lg))
                Button("Add household", systemImage: "plus") {}.buttonStyle(.avenue(.outline, size: .icon))
            }
        case "button-disabled-reason":
            Button("Send notices") {}.buttonStyle(.avenue).disabledReason("Add a mailing address first.")
        case "badge-variants":
            FlowLayout(spacing: 8) {
                Badge("Paid")
                Badge("Draft", variant: .secondary)
                Badge("Past due", variant: .destructive)
                Badge("12 households", variant: .outline)
            }
        case "status-tones":
            statuses(filled: false)
        case "status-filled":
            statuses(filled: true)
        case "chip-states":
            HStack(spacing: CGFloat(AvenueTokens.Spacing.controls)) {
                Chip("Open", count: 4, isSelected: false) {}
                Chip("Closed", count: 12, isSelected: true) {}
                Chip("Mine", isSelected: false) {}
            }
        case "chip-row":
            ChipRow {
                Chip("All", isSelected: false) {}
                Chip("Paid", count: 31, isSelected: false) {}
                Chip("Partial", count: 3, isSelected: false) {}
                Chip("Past due", count: 6, isSelected: true) {}
                Chip("Credit", count: 2, isSelected: false) {}
                Chip("Archived", isSelected: false) {}
            }
        case "initials-avatar-sizes":
            VStack(alignment: .leading, spacing: 16) {
                ForEach(InitialsAvatar.Size.allCases, id: \.self) { size in
                    HStack(spacing: 8) {
                        ForEach(["Sam Ortiz", "Avery Quinn", "Riley Park", "Morgan Diaz"], id: \.self) { name in
                            InitialsAvatar(name: name, size: size)
                        }
                    }
                }
            }
        case "card-default":
            duesCard(.default)
        case "card-sm":
            Card(size: .sm) {
                CardHeader("Dues 2026", description: "Billed March 1") {
                    Button("Edit") {}.buttonStyle(.avenue(.outline, size: .sm))
                }
                CardContent { Text("$240.00 per household · 42 households") }
            }
        case "inline-message-tones":
            VStack(alignment: .leading, spacing: 16) {
                InlineMessage("Couldn't save. Check your connection and try again.", tone: .error)
                InlineMessage("This household has no mailing address.", tone: .warning)
                InlineMessage("Changes save automatically.", tone: .info)
                InlineMessage("Saving…", tone: .pending)
            }
        default:
            Text("No catalog view named \(slug)")
        }
    }

    @MainActor static func statuses(filled: Bool) -> some View {
        FlowLayout(spacing: 8) {
            Status("Paid", tone: .success, filled: filled)
            Status("Partial", tone: .warning, filled: filled)
            Status("Scheduled", tone: .primary, filled: filled)
            Status("Sent", tone: .info, filled: filled)
            Status("Archived", tone: .neutral, filled: filled)
        }
    }

    @MainActor static func duesCard(_ size: CardSize) -> some View {
        Card(size: size) {
            CardHeader("Dues 2026", description: "Billed March 1") {
                Button("Edit") {}.buttonStyle(.avenue(.outline, size: .sm))
            }
            CardContent { Text("$240.00 per household · 42 households") }
        } footer: {
            Button("Request dues") {}.buttonStyle(.avenue)
        }
    }
}

private struct CatalogPage<Content: View>: View {
    @ViewBuilder let content: () -> Content
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(CGFloat(AvenueTokens.Spacing.page))
            .background(AvenueColors(scheme).background)
            .foregroundStyle(AvenueColors(scheme).foreground)
            .avenueTheme()
    }
}

#Preview("Catalog") {
    ScrollView {
        VStack(spacing: 0) {
            ForEach(AvenueCatalog.slugs, id: \.self) { AvenueCatalog.view($0) }
        }
    }
}
