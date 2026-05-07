#import <Foundation/Foundation.h>
#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

@class PoseDetectorFrameProcessorPlugin;

#if __has_include("expo_vision_pose_detector/expo_vision_pose_detector-Swift.h")
#import "expo_vision_pose_detector/expo_vision_pose_detector-Swift.h"
#else
#import "expo_vision_pose_detector-Swift.h"
#endif


VISION_EXPORT_SWIFT_FRAME_PROCESSOR(PoseDetectorFrameProcessorPlugin, detectPose)
