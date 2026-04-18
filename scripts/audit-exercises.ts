import { exerciseDictionary } from '../src/data/exerciseDictionary';

const requiredMetadataFields = [
  'intensity_level',
  'target_outcome',
  'suggested_sets',
  'suggested_reps',
  'suggested_rpe',
  'instruction_pt',
  'image_url'
];

console.log(`Auditing ${exerciseDictionary.length} exercises...`);

exerciseDictionary.forEach(ex => {
  const missing = requiredMetadataFields.filter(field => !(field in ex));
  if (missing.length > 0) {
    console.log(`Exercise: ${ex.pt} (${ex.id}) is missing: ${missing.join(', ')}`);
  }
});
