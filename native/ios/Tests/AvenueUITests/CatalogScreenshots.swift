#if canImport(UIKit)
import SwiftUI
import UIKit
import XCTest
@testable import AvenueUI

/// Renders every catalog view, light and dark, at iPhone width (390pt, 3x) to native/screenshots/ios/<slug>-<scheme>.png,
/// the images Storybook's `Native/*` stories show beside the web component. Run it on an iOS simulator with
/// `bun run native:ios` on a Mac (README, "Native apps"); commit the changed PNGs. The fonts are the iPhone's own
/// (SF Pro), so the images are only comparable from the same Xcode and simulator runtime.
@MainActor
final class CatalogScreenshots: XCTestCase {
    private static let folder = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent() // AvenueUITests
        .deletingLastPathComponent() // Tests
        .deletingLastPathComponent() // ios
        .appendingPathComponent("../screenshots/ios", isDirectory: true)
        .standardizedFileURL

    func testRenderCatalog() throws {
        try FileManager.default.createDirectory(at: Self.folder, withIntermediateDirectories: true)
        for slug in AvenueCatalog.slugs {
            for dark in [false, true] {
                let image = try render(AvenueCatalog.view(slug), dark: dark)
                let file = Self.folder.appendingPathComponent("\(slug)-\(dark ? "dark" : "light").png")
                let data = try XCTUnwrap(image.pngData(), "no PNG for \(slug)")
                try data.write(to: file)
            }
        }
    }

    /// Draws through SwiftUI's own renderer, the one the screen uses. SnapshotTesting's `.image` draws the hosting
    /// view's layer tree on the CPU instead, and that path strokes a `Capsule` with stray marks at its round ends
    /// (outlined Status, Chip, outline Badge) that the device never shows (checked against a simulator screenshot).
    private func render(_ view: some View, dark: Bool) throws -> UIImage {
        let renderer = ImageRenderer(
            content: view
                .frame(width: 390)
                .fixedSize(horizontal: false, vertical: true)
                .environment(\.colorScheme, dark ? .dark : .light)
                .environment(\.dynamicTypeSize, .large)
                .environment(\.displayScale, 3)
        )
        renderer.scale = 3
        renderer.proposedSize = ProposedViewSize(width: 390, height: nil)
        return try XCTUnwrap(renderer.uiImage, "nothing rendered")
    }
}
#endif
