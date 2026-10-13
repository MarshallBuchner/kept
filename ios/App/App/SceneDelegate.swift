import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = KeptViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

class KeptViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(KeptPdfPlugin())
    }
}

@objc(KeptPdfPlugin)
public class KeptPdfPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KeptPdfPlugin"
    public let jsName = "KeptPdf"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "exportReceipt", returnType: CAPPluginReturnPromise)]
    private var exporting = false

    @objc func exportReceipt(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard !self.exporting, let controller = self.bridge?.viewController,
                  controller.presentedViewController == nil else {
                call.reject("Another sheet is open. Close it and try again.")
                return
            }
            self.exporting = true
            let title = call.getString("title") ?? "Receipt"
            let lines = call.getArray("lines", String.self) ?? []
            var photo: UIImage?
            if let encoded = call.getString("image") {
                guard let comma = encoded.firstIndex(of: ","), encoded.hasPrefix("data:image/"),
                      let bytes = Data(base64Encoded: String(encoded[encoded.index(after: comma)...])),
                      let decoded = UIImage(data: bytes) else {
                    self.exporting = false
                    call.reject("The receipt image could not be read. Try the itemized PDF instead.")
                    return
                }
                photo = decoded
            }
            let page = CGRect(x: 0, y: 0, width: 612, height: 792)
            let renderer = UIGraphicsPDFRenderer(bounds: page)
            let data = renderer.pdfData { context in
                context.beginPage()
                var y: CGFloat = 40
                func draw(_ text: String, font: UIFont) {
                    let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: UIColor.black]
                    // Wrap and paginate even unusually long OCR lines/notes.
                    let attributed = NSAttributedString(string: text, attributes: attrs)
                    let storage = NSTextStorage(attributedString: attributed)
                    let manager = NSLayoutManager()
                    storage.addLayoutManager(manager)
                    var start = 0
                    while start < manager.numberOfGlyphs {
                        if y > 730 { context.beginPage(); y = 40 }
                        let container = NSTextContainer(size: CGSize(width: 532, height: 752 - y))
                        container.lineFragmentPadding = 0
                        manager.addTextContainer(container)
                        let range = manager.glyphRange(for: container)
                        guard range.length > 0 else { break }
                        manager.drawBackground(forGlyphRange: range, at: CGPoint(x: 40, y: y))
                        manager.drawGlyphs(forGlyphRange: range, at: CGPoint(x: 40, y: y))
                        y += manager.usedRect(for: container).height + 10
                        start = NSMaxRange(range)
                        if start < manager.numberOfGlyphs { context.beginPage(); y = 40 }
                    }
                }
                draw("Kept", font: .boldSystemFont(ofSize: 12))
                draw(title, font: .boldSystemFont(ofSize: 24))
                for line in lines { draw(line, font: .systemFont(ofSize: 14)) }
                if let photo = photo {
                    if y > 250 { context.beginPage(); y = 40 }
                    let scale = min(532 / photo.size.width, (752 - y) / photo.size.height)
                    photo.draw(in: CGRect(x: 40, y: y, width: photo.size.width * scale, height: photo.size.height * scale))
                }
            }
            let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
            let url = folder.appendingPathComponent("Kept Receipt.pdf")
            do {
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                try data.write(to: url, options: .atomic)
            } catch {
                self.exporting = false
                call.reject("Could not create the PDF. Please try again.")
                return
            }
            let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            sheet.popoverPresentationController?.sourceView = controller.view
            sheet.popoverPresentationController?.sourceRect = CGRect(x: controller.view.bounds.midX, y: controller.view.bounds.midY, width: 1, height: 1)
            sheet.completionWithItemsHandler = { _, completed, _, error in
                self.exporting = false
                try? FileManager.default.removeItem(at: folder)
                if let error = error { call.reject(error.localizedDescription) }
                else { call.resolve(["completed": completed]) }
            }
            controller.present(sheet, animated: true)
        }
    }
}
