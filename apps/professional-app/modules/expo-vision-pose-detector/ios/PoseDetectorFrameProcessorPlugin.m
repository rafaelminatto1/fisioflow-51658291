#import <Foundation/Foundation.h>
#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

@class PoseDetectorFrameProcessorPlugin;

VISION_EXPORT_SWIFT_FRAME_PROCESSOR(PoseDetectorFrameProcessorPlugin, detectPose)
