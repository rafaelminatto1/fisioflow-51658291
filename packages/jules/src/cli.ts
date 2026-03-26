#!/usr/bin/env tsx
import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { parseDiff, JulesAI } from './index.js';
import 'dotenv/config';

const program = new Command();
const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.error(chalk.red('Error: GEMINI_API_KEY is not set in environment.'));
  process.exit(1);
}

const jules = new JulesAI(apiKey);

program
  .name('jules')
  .description('Jules CLI - AI-powered developer tools for FisioFlow')
  .version('0.1.1');

program
  .command('analyze <file>')
  .description('Analyze a file for potential issues')
  .action(async (file: string) => {
    try {
      console.log(chalk.blue(`🔍 Analyzing ${file}...`));
      const fileDiff = execSync(`git diff HEAD -- "${file}"`).toString();
      
      if (!fileDiff) {
        console.log(chalk.yellow(`No unstaged changes found for ${file}. Analyzing current content instead...`));
        // Fallback or just analyze it. For now, let's just use the current content as a "fictional diff" or just read it.
        const content = execSync(`cat "${file}"`).toString();
        const review = await jules.reviewFile(file, content);
        console.log(chalk.green('\n--- Review ---'));
        console.log(review);
      } else {
        const review = await jules.reviewFile(file, fileDiff);
        console.log(chalk.green('\n--- Review ---'));
        console.log(review);
      }
    } catch (error: any) {
      console.error(chalk.red(`Failed to analyze file: ${error.message}`));
    }
  });

program
  .command('summary')
  .description('Generate a summary of staged changes')
  .action(async () => {
    try {
      console.log(chalk.blue('📊 Generating summary of staged changes...'));
      const diff = execSync('git diff --staged').toString();
      
      if (!diff) {
        console.log(chalk.yellow('No staged changes found. Use `git add` to stage changes first.'));
        return;
      }

      const summary = await jules.summarizeChanges(diff);
      console.log(chalk.green('\n--- Summary ---'));
      console.log(summary);
    } catch (error: any) {
      console.error(chalk.red(`Failed to generate summary: ${error.message}`));
    }
  });

await program.parseAsync(process.argv);
