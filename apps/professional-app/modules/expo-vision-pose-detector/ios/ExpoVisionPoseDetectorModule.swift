import ExpoModulesCore
import Vision

public class ExpoVisionPoseDetectorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoVisionPoseDetector")

    // Mantém a função 2D para compatibilidade com o que já criamos
    AsyncFunction("detectPoseAsync") { (imageUrl: String, promise: Promise) in
      self.processPose(imageUrl: imageUrl, is3D: false, promise: promise)
    }

    // Adiciona a função 3D avançada
    AsyncFunction("detectPose3DAsync") { (imageUrl: String, promise: Promise) in
      self.processPose(imageUrl: imageUrl, is3D: true, promise: promise)
    }
  }

  private func processPose(imageUrl: String, is3D: Bool, promise: Promise) {
    guard let url = URL(string: imageUrl),
          let data = try? Data(contentsOf: url),
          let image = UIImage(data: data),
          let cgImage = image.cgImage else {
      promise.reject("ERR_INVALID_IMAGE", "Could not load image")
      return
    }

    let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    
    do {
      if is3D, #available(iOS 17.0, *) {
        let request = VNDetectHumanBodyPose3DRequest()
        try requestHandler.perform([request])
        let results = (request.results ?? []).map { obs -> [String: Any] in
          var pts: [String: Any] = [:]
          if let recognized = try? obs.cameraRelativePoints() {
            for (key, pt) in recognized {
              pts[key.rawValue.rawValue] = [
                "x": Double(pt.position.x),
                "y": Double(pt.position.y),
                "z": Double(pt.position.z)
              ]
            }
          }
          return ["points3d": pts, "confidence": Double(obs.confidence)]
        }
        promise.resolve(results)
      } else {
        let request = VNDetectHumanBodyPoseRequest()
        try requestHandler.perform([request])
        let results = (request.results ?? []).map { obs -> [String: Any] in
          var landmarks: [String: Any] = [:]
          if let recognized = try? obs.recognizedPoints(.all) {
            for (key, pt) in recognized {
              landmarks[key.rawValue.rawValue] = [
                "x": Double(pt.location.x),
                "y": 1.0 - Double(pt.location.y),
                "confidence": Double(pt.confidence)
              ]
            }
          }
          return ["landmarks": landmarks, "confidence": Double(obs.confidence)]
        }
        promise.resolve(results)
      }
    } catch {
      promise.reject("ERR_DETECTION", error.localizedDescription)
    }
  }
}
