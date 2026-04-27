import Vision
import VisionCamera

@objc(PoseDetectorFrameProcessorPlugin)
public class PoseDetectorFrameProcessorPlugin: FrameProcessorPlugin {
  public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
    guard let buffer = frame.buffer else { return nil }
    
    let requestHandler = VNImageRequestHandler(cvPixelBuffer: buffer, options: [:])
    
    do {
      if #available(iOS 17.0, *) {
        let request = VNDetectHumanBodyPose3DRequest()
        try requestHandler.perform([request])
        
        guard let results = request.results else { return [] }
        
        return results.map { obs -> [String: Any] in
          var pts: [String: Any] = [:]
          if let recognized = try? obs.cameraRelativePoints() {
            for (key, pt) in recognized {
              pts[key.rawValue.rawValue] = [
                "x": Double(pt.position.x),
                "y": Double(pt.position.y),
                "z": Double(pt.position.z),
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
        // Fallback for 2D on older iOS versions
        let request = VNDetectHumanBodyPoseRequest()
        try requestHandler.perform([request])
        
        guard let results = request.results else { return [] }
        
        return results.map { obs -> [String: Any] in
          var landmarks: [String: Any] = [:]
          if let recognized = try? obs.recognizedPoints(.all) {
            for (key, pt) in recognized {
              landmarks[key.rawValue.rawValue] = [
                "x": Double(pt.location.x),
                "y": 1.0 - Double(pt.location.y), // Flip Y for normalized coordinates
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
