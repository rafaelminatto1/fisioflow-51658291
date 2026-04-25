import * as exercisesSchema from "../src/server/db/schema/exercises.ts";

console.log("Exercises Schema keys:", Object.keys(exercisesSchema));
if (exercisesSchema.exerciseCategories) {
  console.log("exerciseCategories found!");
} else {
  console.log("exerciseCategories NOT found!");
}
