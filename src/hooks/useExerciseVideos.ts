import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exerciseVideosService, ExerciseVideo, UploadVideoData } from '@/services/exerciseVideos';

/**
 * Hook to fetch all exercise videos with optional filters
 */
export const useExerciseVideos = (filters?: {
  category?: string;
  difficulty?: string;
  bodyPart?: string;
  equipment?: string;
  searchTerm?: string;
}) => {
  return useQuery({
    queryKey: ['exercise-videos', filters],
    queryFn: () => exerciseVideosService.getVideos(filters),
  });
};

/**
 * Hook to fetch a single video by ID
 */
export const useExerciseVideo = (id: string) => {
  return useQuery({
    queryKey: ['exercise-video', id],
    queryFn: () => exerciseVideosService.getVideoById(id),
    enabled: !!id,
  });
};

/**
 * Hook to fetch videos for a specific exercise
 */
export const useExerciseVideosByExerciseId = (exerciseId: string) => {
  return useQuery({
    queryKey: ['exercise-videos', 'exercise', exerciseId],
    queryFn: () => exerciseVideosService.getVideosByExerciseId(exerciseId),
    enabled: !!exerciseId,
  });
};

/**
 * Hook to upload a new exercise video
 */
export const useUploadExerciseVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UploadVideoData) => exerciseVideosService.uploadVideo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-videos'] });
    },
  });
};

/**
 * Hook to update an existing exercise video
 */
export const useUpdateExerciseVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ExerciseVideo> }) =>
      exerciseVideosService.updateVideo(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exercise-videos'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-video', data.id] });
    },
  });
};

/**
 * Hook to delete an exercise video
 */
export const useDeleteExerciseVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => exerciseVideosService.deleteVideo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-videos'] });
    },
  });
};

/**
 * Hook to extract video metadata (duration, dimensions)
 */
export const useVideoMetadata = () => {
  return useMutation({
    mutationFn: (file: File) => exerciseVideosService.extractVideoMetadata(file),
  });
};

/**
 * Hook to generate thumbnail from video
 */
export const useGenerateThumbnail = () => {
  return useMutation({
    mutationFn: (file: File) => exerciseVideosService.generateThumbnail(file),
  });
};
