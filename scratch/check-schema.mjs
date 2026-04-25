import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../packages/db/src/index.ts";

async function checkSchema() {
  console.log("Schema keys:", Object.keys(schema));
  if (schema.exerciseCategories) {
    console.log("exerciseCategories found!");
  } else {
    console.log("exerciseCategories NOT found!");
  }
}

checkSchema();
