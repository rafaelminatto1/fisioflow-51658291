export const useExerciseFavorites = () => ({
  favorites: [],
  loading: false,
  error: null,
  addToFavorites: (exerciseId: string) => console.log('Added to favorites:', exerciseId),
  removeFromFavorites: (exerciseId: string) => console.log('Removed from favorites:', exerciseId)
});