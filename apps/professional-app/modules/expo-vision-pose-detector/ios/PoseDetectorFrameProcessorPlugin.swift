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

        guard let observations = request.results else { return [] }

        // Explicit obs type required — Swift 6 won't infer element type without it
        let mapped: [[String: Any]] = observations.map { (obs: VNHumanBodyPose3DObservation) in
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
          return [
            "points3d": pts,
            "confidence": Double(obs.confidence),
            "is3d": true
          ]
        }
        return mapped
      } else {
        // Fallback 2D for iOS < 17
        let request = VNDetectHumanBodyPoseRequest()
        try requestHandler.perform([request])

        guard let observations = request.results else { return [] }

        let mapped: [[String: Any]] = observations.map { (obs: VNHumanBodyPoseObservation) in
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
        return mapped
      }
    } catch {
      return nil
    }
  }
}
