#if canImport(UIKit)
import SnapshotTesting
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

    private func render(_ view: some View, dark: Bool) throws -> UIImage {
        let traits = UITraitCollection(traitsFrom: [
            UITraitCollection(displayScale: 3),
            UITraitCollection(userInterfaceStyle: dark ? .dark : .light),
            UITraitCollection(preferredContentSizeCategory: .large),
        ])
        let host = UIHostingController(
            rootView: view
                .frame(width: 390)
                .fixedSize(horizontal: false, vertical: true)
                .environment(\.colorScheme, dark ? .dark : .light)
        )
        host.overrideUserInterfaceStyle = dark ? .dark : .light
        let height = host.sizeThatFits(in: CGSize(width: 390, height: .greatestFiniteMagnitude)).height
        var rendered: UIImage?
        let done = expectation(description: "rendered")
        Snapshotting<UIViewController, UIImage>
            .image(precision: 1, size: CGSize(width: 390, height: ceil(height)), traits: traits)
            .snapshot(host)
            .run { image in
                rendered = image
                done.fulfill()
            }
        wait(for: [done], timeout: 10)
        return try XCTUnwrap(rendered)
    }
}
#endif
