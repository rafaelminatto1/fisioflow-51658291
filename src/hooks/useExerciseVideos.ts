import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exerciseVideosService, ExerciseVideo, UploadVideoData, VideoFilterOptions } from '@/services/exerciseVideos';
import { logger } from '@/lib/errors/logger';

// Query key factory for better cache management
export const exerciseVideoKeys = {
  all: ['exercise-videos'] as const,
  lists: () => [...exerciseVideoKeys.all, 'list'] as const,
  list: (filters: VideoFilterOptions | undefined) => [...exerciseVideoKeys.lists(), filters] as const,
  details: () => [...exerciseVideoKeys.all, 'detail'] as const,
  detail: (id: string) => [...exerciseVideoKeys.details(), id] as const,
  byExercise: (exerciseId: string) => [...exerciseVideoKeys.all, 'exercise', exerciseId] as const,
};

/**
 * Hook to fetch all exercise videos with optional filters
 * Includes retry logic and stale time configuration
 */
export const useExerciseVideos = (filters?: VideoFilterOptions) => {
  return useQuery({
    queryKey: exerciseVideoKeys.list(filters || {}),
    queryFn: () => exerciseVideosService.getVideos(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook to fetch a single video by ID
 * Only enabled when a valid ID is provided
 */
export const useExerciseVideo = (id: string) => {
  return useQuery({
    queryKey: exerciseVideoKeys.detail(id),
    queryFn: () => exerciseVideosService.getVideoById(id),
    enabled: !!id && id !== '',
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

/**
 * Hook to fetch videos for a specific exercise
 */
export const useExerciseVideosByExerciseId = (exerciseId: string) => {
  return useQuery({
    queryKey: exerciseVideoKeys.byExercise(exerciseId),
    queryFn: () => exerciseVideosService.getVideosByExerciseId(exerciseId),
    enabled: !!exerciseId && exerciseId !== '',
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to upload a new exercise video
 * Invalidates all video queries on success
 */
export const useUploadExerciseVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UploadVideoData) => exerciseVideosService.uploadVideo(data),
    onSuccess: () => {
      // Invalidate all video list queries
      queryClient.invalidateQueries({ queryKey: exerciseVideoKeys.lists() });
    },
    onError: (error) => {
      logger.error('[useUploadExerciseVideo] Upload failed', error, 'useExerciseVideos');
    },
  });
};

/**
 * Hook to update an existing exercise video's metadata
 * Optimistically updates the cache
 */
export const useUpdateExerciseVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ExerciseVideo> }) =>
      exerciseVideosService.updateVideo(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: exerciseVideoKeys.detail(id) });

      // Snapshot previous value
      const previousVideo = queryClient.getQueryData<ExerciseVideo>(
        exerciseVideoKeys.detail(id)
      );

      // Optimistically update to the new value
      queryClient.setQueryData<ExerciseVideo>(
        exerciseVideoKeys.detail(id),
        (old) => old ? { ...old, ...updates } : undefined
      );

      // Return context with previous value
      return { previousVideo };
    },
    onError: (error, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousVideo) {
        queryClient.setQueryData(
          exerciseVideoKeys.detail(variables.id),
          context.previousVideo
        );
      }
      logger.error('[useUpdateExerciseVideo] Update failed', error, 'useExerciseVideos');
    },
    onSettled: (data) => {
      // Refetch after error or success
      if (data) {
        queryClient.invalidateQueries({ queryKey: exerciseVideoKeys.detail(data.id) });
      }
      queryClient.invalidateQueries({ queryKey: exerciseVideoKeys.lists() });
    },
  });
};

/**
 * Hook to delete an exercise video
 * Removes the video from cache optimistically
 */
export const useDeleteExerciseVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => exerciseVideosService.deleteVideo(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: exerciseVideoKeys.lists() });

      // Snapshot previous value
      const previousVideos = queryClient.getQueryData<ExerciseVideo[]>(
        exerciseVideoKeys.list({})
      );

      // Optimistically remove the video from the list
      queryClient.setQueryData<ExerciseVideo[]>(
        exerciseVideoKeys.list({}),
        (old) => old?.filter((v) => v.id !== id) ?? []
      );

      // Return context with previous value
      return { previousVideos };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousVideos) {
        queryClient.setQueryData(exerciseVideoKeys.list({}), context.previousVideos);
      }
      logger.error('[useDeleteExerciseVideo] Delete failed', error, 'useExerciseVideos');
    },
    onSettled: () => {
      // Refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: exerciseVideoKeys.lists() });
    },
  });
};

/**
 * Hook to extract video metadata (duration, dimensions)
 * Useful for showing preview before upload
 */
export const useVideoMetadata = () => {
  return useMutation({
    mutationFn: (file: File) => exerciseVideosService.extractVideoMetadata(file),
    retry: 1,
    onError: (error) => {
      logger.error('[useVideoMetadata] Failed to extract metadata', error, 'useExerciseVideos');
    },
  });
};

/**
 * Hook to generate thumbnail from video
 * Can be used for thumbnail preview before upload
 */
export const useGenerateThumbnail = () => {
  return useMutation({
    mutationFn: ({ file, time }: { file: File; time?: number }) =>
      exerciseVideosService.generateThumbnail(file, time),
    retry: 1,
    onError: (error) => {
      logger.error('[useGenerateThumbnail] Failed to generate thumbnail', error, 'useExerciseVideos');
    },
  });
};
