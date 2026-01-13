# Referência: Hooks Customizados

## Hooks de API (TanStack Query)

### Pacientes

```typescript
// hooks/usePatients.ts
export function usePatients(filters?: PatientFilters) {
  return useQuery({
    queryKey: ['patients', filters],
    queryFn: () => fetchPatients(filters),
    staleTime: 1000 * 60 * 5,
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => fetchPatient(id),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPatient,
    onSuccess: () => queryClient.invalidateQueries(['patients']),
  });
}
```

### Agendamentos

```typescript
// hooks/useAppointments.ts
export function useAppointments(start: Date, end: Date) {
  return useQuery({
    queryKey: ['appointments', start, end],
    queryFn: () => fetchAppointments(start, end),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => queryClient.invalidateQueries(['appointments']),
  });
}
```

### Exercícios

```typescript
// hooks/useExercises.ts
export function useExercises(category?: string) {
  return useQuery({
    queryKey: ['exercises', category],
    queryFn: () => fetchExercises(category),
  });
}

export function usePrescribeExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: prescribeExercise,
    onSuccess: () => queryClient.invalidateQueries(['prescriptions']),
  });
}
```

## Hooks de Domínio

### usePermissions

```typescript
// hooks/usePermissions.ts
export function usePermissions() {
  const { data: user } = useUser();

  const hasRole = (roles: UserRole[]) => {
    return user?.role && roles.includes(user.role);
  };

  const canAccess = (resource: string, action: string) => {
    // Verifica permissões baseadas no role
  };

  return { hasRole, canAccess, role: user?.role };
}
```

### useAuth

```typescript
// hooks/useAuth.ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signIn, signOut };
}
```

## Hooks de UI

### useMediaQuery

```typescript
// hooks/useMediaQuery.ts
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Uso
const isMobile = useMediaQuery('(max-width: 768px)');
const isDark = useMediaQuery('(prefers-color-scheme: dark)');
```

### useDebounce

```typescript
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Uso
const searchTerm = useDebounce(rawSearchTerm);
```

### useLocalStorage

```typescript
// hooks/useLocalStorage.ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  const setStoredValue = (value: T) => {
    setValue(value);
    localStorage.setItem(key, JSON.stringify(value));
  };

  return [value, setStoredValue] as const;
}

// Uso
const [theme, setTheme] = useLocalStorage('theme', 'light');
```

### useToggle

```typescript
// hooks/useToggle.ts
export function useToggle(initialValue: boolean = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return { value, setValue, toggle, setTrue, setFalse };
}

// Uso
const { value: isOpen, toggle, setTrue: open, setFalse: close } = useToggle();
```

## Hooks de Forms

### useEvaluationForm

```typescript
// hooks/useEvaluationForm.ts
export function useEvaluationForm(formId?: string) {
  const { data: form } = useEvaluationFormById(formId);
  const { data: fields } = useEvaluationFormFields(formId);

  const formMethods = useForm({
    resolver: zodResolver(buildValidationSchema(fields)),
    defaultValues: getDefaultValues(fields),
  });

  const { mutate: submitResponse, isPending } = useCreateEvaluationResponse();

  const handleSubmit = (data: any) => {
    submitResponse({
      form_id: formId,
      responses: data,
    });
  };

  return { form, fields, formMethods, handleSubmit, isPending };
}
```

## Hooks Customizados Avançados

### useRealtimeSubscription

```typescript
// hooks/useRealtimeSubscription.ts
export function useRealtimePatients() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('patients-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'patients',
      }, () => {
        queryClient.invalidateQueries(['patients']);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [queryClient]);
}
```

### useInfiniteScroll

```typescript
// hooks/useInfiniteScroll.ts
export function useInfinitePatients(limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ['patients', 'infinite'],
    queryFn: ({ pageParam = 0 }) => fetchPatients({ limit, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < limit) return undefined;
      return allPages.length * limit;
    },
  });
}

// Uso
const { data, fetchNextPage, hasNextPage } = useInfinitePatients();
```

## Veja Também

- [Tipos TypeScript](./tipos-ts.md) - Tipos usados nos hooks
- [Estado e Forms](../09-estado-forms.md) - Gerenciamento de estado
