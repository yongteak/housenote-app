import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Heart from "lucide-react/dist/esm/icons/heart";

import { listFavorites, toggleFavorite } from "../../features/property/property-favorites.api";
import { useAuth } from "../../lib/auth-context";
import { cn } from "../../lib/cn";

type FavoriteButtonProps = {
  propertyId: string;
  className?: string;
  size?: "sm" | "md";
};

export function FavoriteButton({ propertyId, className, size = "md" }: FavoriteButtonProps) {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ["favorites", actor?.actorId],
    queryFn: () => listFavorites(actor!),
    enabled: Boolean(actor),
  });

  const favorited = favoritesQuery.data?.some((item) => item.property_id === propertyId) ?? false;

  const toggleMutation = useMutation({
    mutationFn: () => toggleFavorite(actor!, propertyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["favorites", actor?.actorId] });
    },
  });

  if (!actor) {
    return null;
  }

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      aria-label={favorited ? "즐겨찾기 해제" : "즐겨찾기"}
      aria-pressed={favorited}
      disabled={toggleMutation.isPending}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition active:scale-95",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        favorited ? "text-rose-500" : "text-slate-300 hover:text-rose-400",
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggleMutation.mutateAsync();
      }}
    >
      <Heart className={cn(iconSize, favorited ? "fill-current" : "")} strokeWidth={2} />
    </button>
  );
}
