#!/usr/bin/env node

/**
 * Script auxiliar para reproduzir o erro do constraint valid_end_time
 * em ambiente local (http://localhost:4173).
 *
 * Passos:
 * 1. Efetua login com o usuário de teste
 * 2. Abre o agendamento "Rafael Minatto De Martino - 08:00 - agendado"
 * 3. Entra no modo de edição, altera o horário para 10:00 e tenta salvar
 *
 * O agendamento existe previamente no seed de dados do ambiente local.
 * O objetivo é disparar a função updateAppointmentV2 com start_time atualizado
 * mas mantendo o end_time antigo (que chega inconsistente no backend).
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';
const LOGIN = {
  email: process.env.FISIOFLOW_USER ?? 'rafael.minatto@yahoo.com.br',
  password: process.env.FISIOFLOW_PASS ?? 'Yukari30@',
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  try {
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'load', timeout: 45000 });

    await page.getByLabel('Email').fill(LOGIN.email);
    await page.getByLabel('Senha').fill(LOGIN.password);
    await page.getByRole('button', { name: 'Entrar na Plataforma' }).click();
    await page.waitForURL(/view=week/, { timeout: 30000 });

    await page.getByRole('button', { name: /Rafael Minatto De Martino - 08:00 - agendado/i }).click();
    await page.getByRole('button', { name: /Editar agendamento/i }).click();

    await page.getByLabel('Horário *').click();
    await page.getByRole('option', { name: '10:00' }).click();

    await page.getByRole('button', { name: /^Salvar$/i }).click();
    await page.waitForTimeout(3000);
  } catch (error) {
    console.error('Falha ao reproduzir o erro:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
