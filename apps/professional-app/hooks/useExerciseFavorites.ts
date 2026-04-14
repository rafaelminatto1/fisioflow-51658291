import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getMyFavoriteExercises,
	favoriteExercise,
	unfavoriteExercise,
} from "@/lib/api";

export function useExerciseFavorites() {
	const queryClient = useQueryClient();

	const { data: favoriteExercises = [], isLoading } = useQuery({
		queryKey: ["exercises", "favorites"],
		queryFn: getMyFavoriteExercises,
		staleTime: 1000 * 60 * 2,
	});

	const favoriteMutation = useMutation({
		mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
			isFavorite ? unfavoriteExercise(id) : favoriteExercise(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["exercises", "favorites"] });
			queryClient.invalidateQueries({ queryKey: ["exercises", "library"] });
		},
	});

	const favorites = favoriteExercises.map((ex) => ex.id);

	const isFavorite = (exerciseId: string) => favorites.includes(exerciseId);

	const toggleFavorite = (exerciseId: string) => {
		const currentlyFavorite = isFavorite(exerciseId);
		favoriteMutation.mutate({ id: exerciseId, isFavorite: currentlyFavorite });
	};

	const addToFavorites = (exerciseId: string) => {
		if (!isFavorite(exerciseId)) {
			favoriteMutation.mutate({ id: exerciseId, isFavorite: false });
		}
	};

	const removeFromFavorites = (exerciseId: string) => {
		if (isFavorite(exerciseId)) {
			favoriteMutation.mutate({ id: exerciseId, isFavorite: true });
		}
	};

	return {
		favorites,
		loading: isLoading,
		addToFavorites,
		removeFromFavorites,
		isFavorite,
		toggleFavorite,
		isToggling: favoriteMutation.isPending,
	};
}
