import SwiftUI

/// Avenue's InlineMessage (web `InlineMessage`, src/components/inline-message.tsx): a one-line message beside the
/// thing it is about, such as a form error, "Saving…" or a warning under a field. `text-field` (16pt on a phone), with
/// a leading icon so colour never carries the state alone (WCAG 1.4.1).
///
/// VoiceOver announces each new message once: an error at once, interrupting, as the web's `role="alert"`; a warning,
/// info or pending message politely, as `role="status"`. Keep one InlineMessage in place and change its message,
/// rather than adding a new one per message; `nil` or "" shows nothing.
public struct InlineMessage: View {
    public enum Tone: String, Sendable, CaseIterable {
        case error, warning, info, pending
    }

    let message: String?
    let tone: Tone
    let hideIcon: Bool
    @ScaledMetric(relativeTo: .body) private var iconSize: CGFloat = 16
    @ScaledMetric(relativeTo: .body) private var lineHeight: CGFloat = CGFloat(AvenueTokens.TypeScale.compact.lineHeight)
    @Environment(\.colorScheme) private var scheme

    /// `hideIcon` is for a message under a field whose own invalid state already signals it.
    public init(_ message: String?, tone: Tone = .error, hideIcon: Bool = false) {
        self.message = message
        self.tone = tone
        self.hideIcon = hideIcon
    }

    public var body: some View {
        let c = AvenueColors(scheme)
        Group {
            if let message, !message.isEmpty {
                HStack(alignment: .top, spacing: CGFloat(AvenueTokens.Spacing.inline)) {
                    if !hideIcon {
                        icon.frame(width: iconSize, height: lineHeight).accessibilityHidden(true)
                    }
                    Text(message)
                        .avenueText(.field)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .foregroundStyle(color(c))
                .accessibilityElement(children: .combine)
            }
        }
        .onChange(of: message) { _, new in announce(new) }
    }

    @ViewBuilder private var icon: some View {
        switch tone {
        case .error: Image(systemName: "exclamationmark.circle").font(.system(size: iconSize * 0.9))
        case .warning: Image(systemName: "exclamationmark.triangle").font(.system(size: iconSize * 0.9))
        case .info: Image(systemName: "info.circle").font(.system(size: iconSize * 0.9))
        case .pending: ProgressView().controlSize(.mini)
        }
    }

    private func color(_ c: AvenueColors) -> Color {
        switch tone {
        case .error: c.destructiveSubtleForeground
        case .warning: c.warningSubtleForeground
        case .info, .pending: c.mutedForeground
        }
    }

    private func announce(_ text: String?) {
        guard let text, !text.isEmpty else { return }
        var spoken = AttributedString(text)
        spoken.accessibilitySpeechAnnouncementPriority = tone == .error ? .high : .default
        AccessibilityNotification.Announcement(spoken).post()
    }
}
