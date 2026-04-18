import { exerciseDictionary } from '../src/data/exerciseDictionary';
import * as fs from 'fs';
import * as path from 'path';

// This script will generate the updated code for exerciseDictionary.ts
// by enriching exercises with clinical metadata based on heuristics.

const enriched = exerciseDictionary.map(ex => {
    const meta = { ...ex };
    
    // Default Suggested Sets
    if (!meta.suggested_sets) {
        if (meta.subcategory === 'Respiratório') meta.suggested_sets = 2;
        else if (meta.intensity_level === 5) meta.suggested_sets = 4;
        else meta.suggested_sets = 3;
    }

    // Default Suggested Reps
    if (!meta.suggested_reps) {
        if (meta.subcategory === 'Alongamento' || meta.pt.includes('Alongamento')) meta.suggested_reps = 30; // seconds
        else if (meta.subcategory === 'Mobilidade' || meta.pt.includes('Mobilização')) meta.suggested_reps = 15;
        else if (meta.subcategory === 'Propriocepção') meta.suggested_reps = 30; // seconds
        else if (meta.subcategory === 'Vestibular') meta.suggested_reps = 60; // seconds
        else if (meta.subcategory === 'Respiratório') meta.suggested_reps = 10;
        else if (meta.intensity_level === 5) meta.suggested_reps = 8;
        else if (meta.intensity_level === 1) meta.suggested_reps = 15;
        else meta.suggested_reps = 12;
    }

    // Default Suggested RPE
    if (!meta.suggested_rpe) {
        if (meta.intensity_level === 5) meta.suggested_rpe = "9";
        else if (meta.intensity_level === 4) meta.suggested_rpe = "8-9";
        else if (meta.intensity_level === 1 || meta.subcategory === 'Alongamento') meta.suggested_rpe = "4-5";
        else if (meta.subcategory === 'Neurodinâmica') meta.suggested_rpe = "3-4";
        else if (meta.subcategory === 'Respiratório' || meta.subcategory === 'Vestibular') meta.suggested_rpe = "Baixo";
        else meta.suggested_rpe = "7-8";
    }

    // Default Equipment
    if (!meta.required_equipment || meta.required_equipment.length === 0) {
        const eq = [];
        const text = (meta.pt + ' ' + meta.description_pt + ' ' + meta.instruction_pt).toLowerCase();
        
        if (text.includes('halter')) eq.push('Halter');
        if (text.includes('kettlebell')) eq.push('Kettlebell');
        if (text.includes('faixa') || text.includes('elástico') || text.includes('miniband') || text.includes('theraband')) eq.push('Faixa Elástica');
        if (text.includes('bola')) eq.push('Bola Suíça');
        if (text.includes('rolo') || text.includes('foam roller')) eq.push('Foam Roller');
        if (text.includes('banco') || text.includes('cadeira')) eq.push('Banco/Cadeira');
        if (text.includes('parede')) eq.push('Parede');
        if (text.includes('degrau') || text.includes('step')) eq.push('Step/Degrau');
        if (text.includes('barra')) eq.push('Barra');
        if (text.includes('bosu')) eq.push('BOSU');
        if (text.includes('disco')) eq.push('Disco Proprioceptivo');
        
        if (eq.length === 0 && meta.intensity_level && meta.intensity_level > 1) {
             // If no equipment found but intensity > 1, maybe Peso do Corpo?
             // But usually it's better to leave empty if bodyweight.
        }
        
        if (eq.length > 0) meta.required_equipment = eq;
    }

    return meta;
});

// Since I cannot easily rewrite the file structure (with the `ex` helper function calls) 
// using simple JSON stringify, I will generate a script that prints the new objects 
// or I'll just manually apply the patterns to the file using replace_file_content 
// for the main blocks.

console.log(JSON.stringify(enriched, null, 2));
