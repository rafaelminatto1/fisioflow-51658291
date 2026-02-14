# Installation Guide

## Step 1: Backup Current File

Before replacing, backup your current evolution file:

```bash
cp /home/rafael/antigravity/fisioflow/fisioflow-51658291/professional-app/app/patient/[id]/evolution.tsx \
   /home/rafael/antigravity/fisioflow/fisioflow-51658291/professional-app/app/patient/[id]/evolution.tsx.backup
```

## Step 2: Copy the Improved File

```bash
cp /home/rafael/antigravity/fisioflow/fisioflow-51658291/.agent/improved-soap-evolution/evolution.tsx \
   /home/rafael/antigravity/fisioflow/fisioflow-51658291/professional-app/app/patient/[id]/evolution.tsx
```

## Step 3: Verify Dependencies

The improved component uses the same dependencies as the original. Verify you have:

```json
{
  "dependencies": {
    "@expo/vector-icons": "*",
    "expo-router": "*",
    "expo-image-picker": "*",
    "@tanstack/react-query": "*",
    "react-native-safe-area-context": "*"
  }
}
```

## Step 4: Test the Changes

1. Start your development server:
   ```bash
   npm start
   # or
   yarn start
   ```

2. Navigate to a patient's evolution page

3. Test all features:
   - Back button navigation
   - Pain level slider
   - All four SOAP input fields
   - Focus states and animations
   - Photo adding (gallery and camera)
   - Photo removal
   - Save functionality

## Step 5: Customization (Optional)

### Adjust Colors

Edit the `SOAP_SECTIONS` object at the top of the file:

```typescript
const SOAP_SECTIONS = {
  subjective: {
    gradient: ['#YOUR_COLOR_1', '#YOUR_COLOR_2'],
    color: '#YOUR_MAIN_COLOR',
    lightColor: '#YOUR_LIGHT_COLOR',
  },
  // ... other sections
};
```

### Adjust Border Radius

Modify the `StyleSheet` at the bottom:

```typescript
// For example, to make cards more rounded
patientCard: {
  borderRadius: 24, // was 16
}
```

### Adjust Spacing

```typescript
// For more compact layout
soapContainer: {
  marginTop: 12, // was 16
  padding: 16, // was 20
}
```

## Troubleshooting

### Issue: "ActivityIndiator is not defined"

**Fix**: Add the import at the top of the file:

```typescript
import { ActivityIndicator } from 'react-native';
```

### Issue: Progress ring not animating smoothly

**Fix**: This is a known limitation with the simplified SVG-less implementation. For production, consider using `react-native-svg`:

```bash
npm install react-native-svg
```

Then replace the `ProgressRing` component with an SVG-based implementation.

### Issue: Photos not displaying

**Fix**: Ensure `Image` is imported:

```typescript
import { Image } from 'react-native';
```

### Issue: Type errors

**Fix**: Ensure proper TypeScript types. The improved file includes all necessary type definitions.

## Rollback

If you need to revert to the original version:

```bash
cp /home/rafael/antigravity/fisioflow/fisioflow-51658291/professional-app/app/patient/[id]/evolution.tsx.backup \
   /home/rafael/antigravity/fisioflow/fisioflow-51658291/professional-app/app/patient/[id]/evolution.tsx
```

## Additional Enhancements

Consider adding these for even better UX:

1. **Auto-save**: Implement debounced auto-save as user types
2. **Templates**: Add pre-filled SOAP templates for common conditions
3. **Voice input**: Integrate speech-to-text for faster entry
4. **Drafts**: Save drafts when user navigates away accidentally
5. **Offline support**: Queue changes when offline and sync when connected

## Support

For issues or questions, refer to:
- Main README: `/home/rafael/antigravity/fisioflow/fisioflow-51658291/.agent/improved-soap-evolution/README.md`
- Style Guide: `/home/rafael/antigravity/fisioflow/fisioflow-51658291/.agent/improved-soap-evolution/STYLE_GUIDE.md`
