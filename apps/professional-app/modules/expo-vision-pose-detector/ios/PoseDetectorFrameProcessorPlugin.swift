import Vision
import VisionCamera

@objc(PoseDetectorFrameProcessorPlugin)
public class PoseDetectorFrameProcessorPlugin: FrameProcessorPlugin {
  public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
    // VisionCamera v4: frame.buffer is CMSampleBuffer (non-optional)
    guard let pixelBuffer = CMSampleBufferGetImageBuffer(frame.buffer) else { return nil }

    let requestHandler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])

    do {
      if #available(iOS 17.0, *) {
        let request = VNDetectHumanBodyPose3DRequest()
        try requestHandler.perform([request])

        guard let results = request.results else { return [] }

        return results.map { obs -> [String: Any] in
          var pts: [String: Any] = [:]
          for jointName in obs.availableJointNames() {
            if let pt = try? obs.recognizedPoint(jointName) {
              // localPosition is simd_float3 (position relative to parent joint)
              pts[jointName.rawValue.rawValue] = [
                "x": Double(pt.localPosition.x),
                "y": Double(pt.localPosition.y),
                "z": Double(pt.localPosition.z),
                "confidence": Double(pt.confidence)
              ]
            }
          }
          return [
            "points3d": pts,
            "confidence": Double(obs.confidence),
            "is3d": true
          ]
        }
      } else {
        // Fallback 2D for iOS < 17
        let request = VNDetectHumanBodyPoseRequest()
        try requestHandler.perform([request])

        guard let results = request.results else { return [] }

        return results.map { obs -> [String: Any] in
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
          return [
            "landmarks": landmarks,
            "confidence": Double(obs.confidence),
            "is3d": false
          ]
        }
      }
    } catch {
      return nil
    }
  }
}
