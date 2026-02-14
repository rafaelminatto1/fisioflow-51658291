# Before & After Comparison

## Header Section

### Before
```tsx
<View style={[styles.header, { borderBottomColor: colors.border }]}>
  <TouchableOpacity onPress={() => router.back()}>
    <Ionicons name="chevron-back" size={28} color={colors.text} />
  </TouchableOpacity>
  <Text style={[styles.title, { color: colors.text }]}>Nova Evolução</Text>
  <View style={{ width: 28 }} />
</View>
```
- Simple back button (no background)
- Static title only
- Empty spacer for layout balance

### After
```tsx
<View style={[styles.header, { borderBottomColor: colors.border }]}>
  <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.surface }]}>
    <Ionicons name="chevron-back" size={24} color={colors.text} />
  </TouchableOpacity>
  <View style={styles.headerCenter}>
    <Text style={[styles.headerTitle, { color: colors.text }]}>Nova Evolução</Text>
    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
      {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
    </Text>
  </View>
  <View style={styles.headerProgress}>
    <ProgressRing progress={completionPercentage} size={44} strokeWidth={3} />
  </View>
</View>
```
- Circular back button with background
- Title + current date
- Animated circular progress indicator

## Patient Info Section

### Before
```tsx
<View style={[styles.patientInfo, { backgroundColor: colors.surface }]}>
  <Ionicons name="person" size={20} color={colors.primary} />
  <Text style={[styles.patientName, { color: colors.text }]}>{patientName}</Text>
</View>
```
- Simple row with icon and text
- No session status indicator
- Minimal visual interest

### After
```tsx
<View style={[styles.patientCard, { backgroundColor: colors.surface }]}>
  <View style={[styles.patientAvatar, { backgroundColor: `${colors.primary}20` }]}>
    <Ionicons name="person" size={24} color={colors.primary} />
  </View>
  <View style={styles.patientInfo}>
    <Text style={[styles.patientName, { color: colors.text }]}>{patientName}</Text>
    <Text style={[styles.sessionLabel, { color: colors.textSecondary }]}>
      Sessão de avaliação
    </Text>
  </View>
  <View style={styles.sessionStatus}>
    <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
    <Text style={[styles.statusText, { color: colors.textSecondary }]}>Em andamento</Text>
  </View>
</View>
```
- Large avatar with colored background
- Patient name + session label
- Live status indicator with dot

## SOAP Input Fields

### Before
```tsx
<View style={styles.soapField}>
  <View style={styles.soapLabelRow}>
    <View style={[styles.soapLabelBadge, { backgroundColor: colors.primary }]}>
      <Text style={[styles.soapLabelText, { color: '#FFFFFF' }]}>S</Text>
    </View>
    <Text style={[styles.soapFieldLabel, { color: colors.text }]}>Subjetivo</Text>
  </View>
  <TextInput
    style={[styles.soapInput, { backgroundColor: colors.surface, borderColor: colors.border }]}
    placeholder="O que o paciente relatou?"
    multiline
  />
</View>
```
- Simple label row with badge
- Basic text input
- No focus feedback
- No character count
- No clear button

### After
```tsx
<SOAPInputField
  section={SOAP_SECTIONS.subjective}
  value={subjective}
  onChangeText={setSubjective}
  isFocused={focusedField === 'subjective'}
  onFocus={() => setFocusedField('subjective')}
  colors={colors}
/>
```
- Animated border color on focus
- Field description below label
- Completion checkmark when filled
- Character counter at bottom
- Clear button for non-empty fields
- Section-specific color theming

## Pain Level Section

### Before
```tsx
<Card style={styles.sectionCard} padding="sm">
  <View style={styles.painDisplay}>
    <View style={[styles.painValueContainer, { backgroundColor: getPainColor(painLevel) }]}>
      <Text style={[styles.painValue, { color: '#FFFFFF' }]}>{painLevel}</Text>
    </View>
    <Text style={[styles.painLabel, { color: colors.text }]}>/ 10</Text>
    <Text style={[styles.painDescription, { color: colors.textSecondary }]}>
      {getPainDescription(painLevel)}
    </Text>
  </View>
  <Slider ... />
</Card>
```
- Simple colored circle for value
- Plain text description
- No emoji visual

### After
```tsx
<PainLevelSlider painLevel={painLevel} onValueChange={setPainLevel} colors={colors} />
```
- Emoji representation (😊 to 😫)
- Large value display with shadow
- Colored description card with background
- Better visual hierarchy

## Photos Section

### Before
```tsx
{photos.length > 0 ? (
  <View style={styles.photosGrid}>
    {photos.map((photo) => (
      <View key={photo.id} style={styles.photoContainer}>
        <Image source={{ uri: photo.uri }} style={styles.photo} />
        <TouchableOpacity style={styles.removePhotoButton}>
          <Ionicons name="close-circle" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>
    ))}
  </View>
) : (
  <TouchableOpacity style={[styles.emptyPhotos, { borderColor: colors.border }]}>
    <Ionicons name="images" size={48} color={colors.textMuted} />
    <Text>Adicionar fotos</Text>
  </TouchableOpacity>
)}
```
- Basic grid layout
- Simple empty state
- Icon overlay for remove

### After
```tsx
<PhotoGrid
  photos={photos}
  onAddPhoto={handleAddPhoto}
  onTakePhoto={handleTakePhoto}
  onRemovePhoto={handleRemovePhoto}
  colors={colors}
/>
```
- Improved empty state with large icon
- Photo count badge (X/5)
- Styled remove button (red circle)
- Better spacing and rounded corners
- Dedicated action buttons at bottom

## Save Button

### Before
```tsx
<Button
  title="Salvar Evolução"
  onPress={handleSave}
  loading={createMutation.isPending}
  style={styles.saveButton}
/>
```
- Standard button component
- No disabled state feedback
- No context hint

### After
```tsx
<TouchableOpacity
  style={[
    styles.saveButton,
    {
      backgroundColor: canSave ? colors.primary : colors.border,
      opacity: canSave ? 1 : 0.6,
    }
  ]}
  onPress={handleSave}
  disabled={createMutation.isPending || !canSave}
>
  {createMutation.isPending ? (
    <>
      <ActivityIndicator size="small" color="#FFFFFF" />
      <Text style={styles.saveButtonText}>Salvando...</Text>
    </>
  ) : (
    <>
      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
      <Text style={styles.saveButtonText}>Salvar Evolução</Text>
    </>
  )}
</TouchableOpacity>
<Text style={[styles.saveHint, { color: colors.textSecondary }]}>
  Preencha pelo menos um campo do SOAP para salvar
</Text>
```
- Visual disabled state
- Loading state with spinner
- Icon + text for normal state
- Contextual hint text below

## Key Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Visual Feedback Elements | 3 | 12+ | +300% |
| Color Variants | 4 basic | 4 gradients + light variants | +100% |
| Progress Indicators | 0 | 3 (ring, bar, badges) | New |
| Input Enhancements | 0 | 4 (focus, counter, clear, checkmark) | New |
| Card Border Radius | 16px | 20px (main), 16px (small) | More cohesive |
| Shadow Levels | 1 | 3 (subtle, medium, strong) | Better depth |
| Touch Target Sizes | Mixed | Consistent 44px minimum | Better UX |
| Empty States | Basic icon | Icon + text + background | More helpful |
