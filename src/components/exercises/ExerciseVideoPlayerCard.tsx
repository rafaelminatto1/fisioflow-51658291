import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Keyboard, RotateCcw, RotateCw, Copy } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Slider } from '@/components/shared/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { exerciseVideosService, type ExerciseVideo } from '@/services/exerciseVideos';

export interface ExerciseVideoPlayerProps {
  src: string;
  thumbnail?: string;
  title?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
  onEnded?: () => void;
  onProgress?: (progress: number) => void;
}

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const ExerciseVideoPlayer: React.FC<ExerciseVideoPlayerProps> = ({
  src,
  thumbnail,
  title,
  autoPlay = false,
  loop = false,
  muted = false,
  className,
  onEnded,
  onProgress,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use refs for callbacks to avoid re-attaching event listeners
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);

  // Keep refs in sync with props
  useEffect(() => {
    onProgressRef.current = onProgress;
    onEndedRef.current = onEnded;
  }, [onProgress, onEnded]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onProgressRef.current?.(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEndedRef.current?.();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []); // Empty deps - event listeners only attached once

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (autoPlay) {
      video.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  }, [autoPlay]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      container.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, [isFullscreen]);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    // Check if PiP is supported
    if (!document.pictureInPictureEnabled || !(video as any).requestPictureInPicture) {
      console.warn('Picture-in-Picture is not supported in this browser');
      return;
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn('PiP failed:', error.message);
      }
    }
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
  }, []);

  const skipBackward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'p':
          e.preventDefault();
          togglePip();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(duration || 0, video.currentTime + 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume((prev) => Math.min(1, prev + 0.1));
          video.volume = Math.min(1, video.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume((prev) => Math.max(0, prev - 0.1));
          video.volume = Math.max(0, video.volume - 0.1);
          break;
        case '<':
        case ',': {
          // Slow down
          e.preventDefault();
          const newSlowerRate = SPEED_OPTIONS[Math.max(0, SPEED_OPTIONS.indexOf(playbackRate) - 1)] || playbackRate / 2;
          handleSpeedChange(newSlowerRate);
          break;
        }
        case '>':
        case '.': {
          // Speed up
          e.preventDefault();
          const newFasterRate = SPEED_OPTIONS[Math.min(SPEED_OPTIONS.length - 1, SPEED_OPTIONS.indexOf(playbackRate) + 1)] || playbackRate * 2;
          handleSpeedChange(newFasterRate);
          break;
        }
        case 'Home':
          e.preventDefault();
          video.currentTime = 0;
          break;
        case 'End':
          e.preventDefault();
          video.currentTime = duration || 0;
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9': {
          // Jump to percentage (0-90%)
          e.preventDefault();
          const percent = parseInt(e.key) * 0.1;
          video.currentTime = (duration || 0) * percent;
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [duration, togglePlay, toggleMute, toggleFullscreen, togglePip, playbackRate, handleSpeedChange]);

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = value[0];
    setVolume(value[0]);
    if (value[0] > 0) {
      setIsMuted(false);
    }
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const formatTime = (time: number) => {
    return exerciseVideosService.formatDuration(time);
  };

  const handleControlsVisibility = () => {
    setShowControls(true);
    setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative group bg-black rounded-lg overflow-hidden',
        className
      )}
      onMouseMove={handleControlsVisibility}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={thumbnail}
        className="w-full h-full object-contain"
        loop={loop}
        playsInline
        onClick={togglePlay}
      />

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Play/Pause overlay button */}
      {!isLoading && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            size="icon"
            variant="ghost"
            className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
            onClick={togglePlay}
          >
            <Play className="w-8 h-8 fill-white text-white" />
          </Button>
        </div>
      )}

      {/* Controls */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity',
          !showControls && 'opacity-0'
        )}
      >
        {/* Title */}
        {title && (
          <h3 className="text-white text-sm font-medium mb-2 truncate">{title}</h3>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-white hover:text-white hover:bg-white/20"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>

          {/* Skip backward */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-white/70 hover:text-white hover:bg-white/10"
            onClick={skipBackward}
            title="Retroceder 10s (-)"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          {/* Skip forward */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-white/70 hover:text-white hover:bg-white/10"
            onClick={skipForward}
            title="Avançar 10s (+)"
          >
            <RotateCw className="w-4 h-4" />
          </Button>

          <div className="flex-1 flex items-center gap-2">
            <span className="text-white text-xs w-10 text-right shrink-0">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-white text-xs w-10 shrink-0">
              {formatTime(duration)}
            </span>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-20"
            />
          </div>

          {/* Speed control */}
          <DropdownMenu open={showSpeedMenu} onOpenChange={setShowSpeedMenu}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 px-2 text-white hover:text-white hover:bg-white/10 text-xs font-mono"
              >
                {playbackRate}x
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {SPEED_OPTIONS.map((speed) => (
                <DropdownMenuItem
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={cn(
                    'justify-center font-mono',
                    playbackRate === speed && 'bg-accent'
                  )}
                >
                  {speed}x
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* PiP */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-white hover:text-white hover:bg-white/20"
            onClick={togglePip}
            title="Picture-in-Picture (p)"
          >
            <Copy className="w-4 h-4" />
          </Button>

          {/* Fullscreen */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-white hover:text-white hover:bg-white/20"
            onClick={toggleFullscreen}
            title="Tela cheia (f)"
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </Button>

          {/* Keyboard shortcuts hint */}
          <div className="absolute -top-10 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-white/50 hover:text-white/80 hover:bg-white/10"
              title="Atalhos: Espaço/K=play, M=mudo, F=tela cheia, P=PiP, +/- velocidade, ←/→=seek, -/+ skip 10s"
            >
              <Keyboard className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact video player component for use in lists
 */
export interface CompactVideoPlayerProps {
  src: string;
  thumbnail?: string;
  className?: string;
}

export const CompactVideoPlayer: React.FC<CompactVideoPlayerProps> = ({
  src,
  thumbnail,
  className,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div
      className={cn('relative aspect-video bg-black rounded-lg overflow-hidden', className)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={thumbnail}
        className="w-full h-full object-cover"
        playsInline
      />

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-6 h-6 fill-black text-black ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Video card component for displaying video with thumbnail
 */
export interface ExerciseVideoCardProps {
  video: ExerciseVideo;
  onClick?: () => void;
  className?: string;
}

export const ExerciseVideoCard: React.FC<ExerciseVideoCardProps> = ({
  video,
  onClick,
  className,
}) => {
  return (
    <div
      className={cn(
        'group cursor-pointer overflow-hidden rounded-lg border bg-card transition-all hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <div className="relative aspect-video bg-muted">
        <CompactVideoPlayer
          src={video.video_url}
          thumbnail={video.thumbnail_url}
        />

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs font-medium">
            {exerciseVideosService.formatDuration(video.duration)}
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-primary/80 text-white text-xs font-medium capitalize">
          {video.category}
        </div>
      </div>

      <div className="p-3">
        <h4 className="font-medium text-sm line-clamp-1">{video.title}</h4>
        {video.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {video.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
            {video.difficulty}
          </span>
        </div>
      </div>
    </div>
  );
};
