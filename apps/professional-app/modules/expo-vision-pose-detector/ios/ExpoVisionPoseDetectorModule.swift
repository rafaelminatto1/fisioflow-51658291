import ExpoModulesCore
import Vision

public class ExpoVisionPoseDetectorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoVisionPoseDetector")

    AsyncFunction("detectPoseAsync") { (imageUrl: String, promise: Promise) in
      self.processPose(imageUrl: imageUrl, is3D: false, promise: promise)
    }

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
        // Explicit obs type required — Swift 6 won't infer element type without it
        let results: [[String: Any]] = (request.results ?? []).map { (obs: VNHumanBodyPose3DObservation) in
          var pts: [String: Any] = [:]
          // availableJointNames is a property (not a method)
          for jointName in obs.availableJointNames {
            if let pt = try? obs.recognizedPoint(jointName) {
              // localPosition is simd_float4x4; translation is in column 3
              pts[jointName.rawValue.rawValue] = [
                "x": Double(pt.localPosition.columns.3.x),
                "y": Double(pt.localPosition.columns.3.y),
                "z": Double(pt.localPosition.columns.3.z)
              ]
            }
          }
          // confidence belongs to the observation, not individual joints
          return ["points3d": pts, "confidence": Double(obs.confidence)]
        }
        promise.resolve(results)
      } else {
        let request = VNDetectHumanBodyPoseRequest()
        try requestHandler.perform([request])
        let results: [[String: Any]] = (request.results ?? []).map { (obs: VNHumanBodyPoseObservation) in
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
