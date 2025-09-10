// Export simplified use-toast
export const useToast = () => ({
  toast: ({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
    console.log(`Toast: ${title} - ${description}`);
  }
});

export const toast = ({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
  console.log(`Toast: ${title} - ${description}`);
};