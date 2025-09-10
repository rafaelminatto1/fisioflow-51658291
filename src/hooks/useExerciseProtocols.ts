export const useExerciseProtocols = () => ({
  protocols: [],
  loading: false,
  error: null,
  createProtocol: (protocol: any) => console.log('Created protocol:', protocol),
  updateProtocol: (id: string, protocol: any) => console.log('Updated protocol:', id, protocol),
  deleteProtocol: (id: string) => console.log('Deleted protocol:', id)
});