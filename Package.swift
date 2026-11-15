// swift-tools-version: 5.10
// Avenue's SwiftUI components for the ManyAve iPhone apps (README, "Native apps"). The web components can't run on a
// phone (ui-sdk is web only), so these are SwiftUI views with the web components' names, options and look, built on
// the generated tokens in native/AvenueTokens.swift. Add this repository as a Swift package and `import AvenueUI`.
import PackageDescription

let package = Package(
    name: "AvenueUI",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "AvenueUI", targets: ["AvenueUI"]),
    ],
    targets: [
        // AvenueTokens.swift in this folder is a link to the generated native/AvenueTokens.swift.
        .target(name: "AvenueUI", path: "native/ios/Sources/AvenueUI"),
        .testTarget(
            name: "AvenueUITests",
            dependencies: ["AvenueUI"],
            path: "native/ios/Tests/AvenueUITests"
        ),
    ]
)
