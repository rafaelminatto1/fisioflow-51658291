import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import {
  convenios,
  empresasParceiras,
  fornecedores,
  formasPagamento,
} from '@fisioflow/db';
import { createDb } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

type FinancialApp = Hono<{ Bindings: Env; Variables: AuthVariables }>;

export const registerFinancialCatalogRoutes = (app: FinancialApp) => {
  app.get('/empresas-parceiras', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);

    try {
      const result = await db.select().from(empresasParceiras)
        .where(eq(empresasParceiras.organizationId, user.organizationId))
        .orderBy(empresasParceiras.nome);

      return c.json({ data: result });
    } catch (e) {
      console.error('[Financial/EmpresasParceiras] Drizzle error:', e);
      return c.json({ data: [] });
    }
  });

  app.post('/empresas-parceiras', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as any;

    if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

    try {
      const [result] = await db.insert(empresasParceiras)
        .values({
          organizationId: user.organizationId,
          nome: String(body.nome),
          contato: body.contato ?? null,
          email: body.email ?? null,
          telefone: body.telefone ?? null,
          contrapartidas: body.contrapartidas ?? null,
          observacoes: body.observacoes ?? null,
          ativo: body.ativo !== undefined ? String(body.ativo) : 'true',
        })
        .returning();

      return c.json({ data: result }, 201);
    } catch (e) {
      console.error('[Financial/EmpresasParceiras] Insert error:', e);
      return c.json({ error: 'Erro ao criar empresa parceira' }, 500);
    }
  });

  app.put('/empresas-parceiras/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as any;

    try {
      const [result] = await db.update(empresasParceiras)
        .set({
          nome: body.nome !== undefined ? String(body.nome) : undefined,
          contato: body.contato !== undefined ? body.contato : undefined,
          email: body.email !== undefined ? body.email : undefined,
          telefone: body.telefone !== undefined ? body.telefone : undefined,
          contrapartidas: body.contrapartidas !== undefined ? body.contrapartidas : undefined,
          observacoes: body.observacoes !== undefined ? body.observacoes : undefined,
          ativo: body.ativo !== undefined ? String(body.ativo) : undefined,
          updatedAt: new Date(),
        })
        .where(and(
          eq(empresasParceiras.id, id),
          eq(empresasParceiras.organizationId, user.organizationId)
        ))
        .returning();

      if (!result) return c.json({ error: 'Empresa parceira não encontrada' }, 404);
      return c.json({ data: result });
    } catch (e) {
      console.error('[Financial/EmpresasParceiras] Update error:', e);
      return c.json({ error: 'Erro ao atualizar empresa parceira' }, 500);
    }
  });

  app.delete('/empresas-parceiras/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    try {
      const [result] = await db.update(empresasParceiras).set({ deletedAt: new Date() })
        .where(and(
          eq(empresasParceiras.id, id),
          eq(empresasParceiras.organizationId, user.organizationId)
        ))
        .returning();

      if (!result) return c.json({ error: 'Empresa parceira não encontrada' }, 404);
      return c.json({ ok: true });
    } catch (e) {
      console.error('[Financial/EmpresasParceiras] Delete error:', e);
      return c.json({ error: 'Erro ao deletar empresa parceira' }, 500);
    }
  });

  app.get('/fornecedores', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);

    try {
      const result = await db.select().from(fornecedores)
        .where(eq(fornecedores.organizationId, user.organizationId))
        .orderBy(fornecedores.razaoSocial);

      return c.json({ data: result });
    } catch (e) {
      console.error('[Financial/Fornecedores] Drizzle error:', e);
      return c.json({ data: [] });
    }
  });

  app.post('/fornecedores', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as any;

    if (!body.razao_social) return c.json({ error: 'razao_social é obrigatório' }, 400);

    try {
      const [result] = await db.insert(fornecedores)
        .values({
          organizationId: user.organizationId,
          tipoPessoa: body.tipo_pessoa ?? 'pj',
          razaoSocial: body.razao_social,
          nomeFantasia: body.nome_fantasia ?? null,
          cpfCnpj: body.cpf_cnpj ?? null,
          inscricaoEstadual: body.inscricao_estadual ?? null,
          email: body.email ?? null,
          telefone: body.telefone ?? null,
          celular: body.celular ?? null,
          endereco: body.endereco ?? null,
          cidade: body.cidade ?? null,
          estado: body.estado ?? null,
          cep: body.cep ?? null,
          observacoes: body.observacoes ?? null,
          categoria: body.categoria ?? null,
          ativo: body.ativo !== undefined ? String(body.ativo) : 'true',
        })
        .returning();

      return c.json({ data: result }, 201);
    } catch (e) {
      console.error('[Financial/Fornecedores] Insert error:', e);
      return c.json({ error: 'Erro ao criar fornecedor' }, 500);
    }
  });

  app.put('/fornecedores/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as any;

    try {
      const [result] = await db.update(fornecedores)
        .set({
          tipoPessoa: body.tipo_pessoa !== undefined ? body.tipo_pessoa : undefined,
          razaoSocial: body.razao_social !== undefined ? body.razao_social : undefined,
          nomeFantasia: body.nome_fantasia !== undefined ? body.nome_fantasia : undefined,
          cpfCnpj: body.cpf_cnpj !== undefined ? body.cpf_cnpj : undefined,
          inscricaoEstadual: body.inscricao_estadual !== undefined ? body.inscricao_estadual : undefined,
          email: body.email !== undefined ? body.email : undefined,
          telefone: body.telefone !== undefined ? body.telefone : undefined,
          celular: body.celular !== undefined ? body.celular : undefined,
          endereco: body.endereco !== undefined ? body.endereco : undefined,
          cidade: body.cidade !== undefined ? body.cidade : undefined,
          estado: body.estado !== undefined ? body.estado : undefined,
          cep: body.cep !== undefined ? body.cep : undefined,
          observacoes: body.observacoes !== undefined ? body.observacoes : undefined,
          categoria: body.categoria !== undefined ? body.categoria : undefined,
          ativo: body.ativo !== undefined ? String(body.ativo) : undefined,
          updatedAt: new Date(),
        })
        .where(and(
          eq(fornecedores.id, id),
          eq(fornecedores.organizationId, user.organizationId)
        ))
        .returning();

      if (!result) return c.json({ error: 'Fornecedor não encontrado' }, 404);
      return c.json({ data: result });
    } catch (e) {
      console.error('[Financial/Fornecedores] Update error:', e);
      return c.json({ error: 'Erro ao atualizar fornecedor' }, 500);
    }
  });

  app.delete('/fornecedores/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    try {
      const [result] = await db.update(fornecedores).set({ deletedAt: new Date() })
        .where(and(
          eq(fornecedores.id, id),
          eq(fornecedores.organizationId, user.organizationId)
        ))
        .returning();

      if (!result) return c.json({ error: 'Fornecedor não encontrado' }, 404);
      return c.json({ ok: true });
    } catch (e) {
      console.error('[Financial/Fornecedores] Delete error:', e);
      return c.json({ error: 'Erro ao deletar fornecedor' }, 500);
    }
  });

  app.get('/formas-pagamento', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);

    try {
      const result = await db.select().from(formasPagamento)
        .where(eq(formasPagamento.organizationId, user.organizationId))
        .orderBy(formasPagamento.nome);

      return c.json({ data: result });
    } catch (e) {
      console.error('[Financial/FormasPagamento] Drizzle error:', e);
      return c.json({ data: [] });
    }
  });

  app.post('/formas-pagamento', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as any;

    if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

    try {
      const [result] = await db.insert(formasPagamento)
        .values({
          organizationId: user.organizationId,
          nome: String(body.nome),
          tipo: body.tipo ?? 'geral',
          taxaPercentual: body.taxa_percentual != null ? String(body.taxa_percentual) : '0',
          diasRecebimento: body.dias_recebimento != null ? Number(body.dias_recebimento) : 0,
          ativo: body.ativo !== false,
        })
        .returning();

      return c.json({ data: result }, 201);
    } catch (e) {
      console.error('[Financial/FormasPagamento] Insert error:', e);
      return c.json({ error: 'Erro ao criar forma de pagamento' }, 500);
    }
  });

  app.put('/formas-pagamento/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as any;

    try {
      const [result] = await db.update(formasPagamento)
        .set({
          nome: body.nome !== undefined ? String(body.nome) : undefined,
          tipo: body.tipo !== undefined ? body.tipo : undefined,
          taxaPercentual: body.taxa_percentual !== undefined ? String(body.taxa_percentual) : undefined,
          diasRecebimento: body.dias_recebimento !== undefined ? Number(body.dias_recebimento) : undefined,
          ativo: body.ativo !== undefined ? Boolean(body.ativo) : undefined,
          updatedAt: new Date(),
        })
        .where(and(
          eq(formasPagamento.id, id),
          eq(formasPagamento.organizationId, user.organizationId)
        ))
        .returning();

      if (!result) return c.json({ error: 'Forma de pagamento não encontrada' }, 404);
      return c.json({ data: result });
    } catch (e) {
      console.error('[Financial/FormasPagamento] Update error:', e);
      return c.json({ error: 'Erro ao atualizar forma de pagamento' }, 500);
    }
  });

  app.delete('/formas-pagamento/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    try {
      const [result] = await db.update(formasPagamento).set({ deletedAt: new Date() })
        .where(and(
          eq(formasPagamento.id, id),
          eq(formasPagamento.organizationId, user.organizationId)
        ))
        .returning();

      if (!result) return c.json({ error: 'Forma de pagamento não encontrada' }, 404);
      return c.json({ ok: true });
    } catch (e) {
      console.error('[Financial/FormasPagamento] Delete error:', e);
      return c.json({ error: 'Erro ao deletar forma de pagamento' }, 500);
    }
  });

  app.get('/convenios', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { ativo } = c.req.query();

    const where = [eq(convenios.organizationId, user.organizationId)];
    if (ativo !== undefined) {
      where.push(eq(convenios.ativo, ativo === 'true'));
    }

    try {
      const result = await db.select()
        .from(convenios)
        .where(and(...where))
        .orderBy(convenios.nome);

      return c.json({ data: result });
    } catch (e) {
      console.error('[Financial/Convenios] Get error:', e);
      return c.json({ data: [] });
    }
  });

  app.post('/convenios', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as Record<string, any>;

    if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

    try {
      const [result] = await db.insert(convenios)
        .values({
          organizationId: user.organizationId,
          nome: String(body.nome),
          cnpj: body.cnpj ?? null,
          telefone: body.telefone ?? null,
          email: body.email ?? null,
          contatoResponsavel: body.contato_responsavel ?? null,
          valorRepasse: body.valor_repasse != null ? String(body.valor_repasse) : null,
          prazoPagamentoDias: body.prazo_pagamento_dias != null ? Number(body.prazo_pagamento_dias) : null,
          observacoes: body.observacoes ?? null,
          ativo: body.ativo !== false,
        })
        .returning();

      return c.json({ data: result }, 201);
    } catch (e) {
      console.error('[Financial/Convenios] Create error:', e);
      return c.json({ error: 'Erro ao criar convênio' }, 500);
    }
  });

  app.put('/convenios/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as Record<string, any>;

    try {
      const [result] = await db.update(convenios)
        .set({
          nome: body.nome !== undefined ? String(body.nome) : undefined,
          cnpj: body.cnpj !== undefined ? body.cnpj : undefined,
          telefone: body.telefone !== undefined ? body.telefone : undefined,
          email: body.email !== undefined ? body.email : undefined,
          contatoResponsavel: body.contato_responsavel !== undefined ? body.contato_responsavel : undefined,
          valorRepasse: body.valor_repasse !== undefined ? String(body.valor_repasse) : undefined,
          prazoPagamentoDias: body.prazo_pagamento_dias !== undefined ? Number(body.prazo_pagamento_dias) : undefined,
          observacoes: body.observacoes !== undefined ? body.observacoes : undefined,
          ativo: body.ativo !== undefined ? body.ativo : undefined,
          updatedAt: new Date(),
        })
        .where(and(
          eq(convenios.id, id),
          eq(convenios.organizationId, user.organizationId)
        ))
        .returning();

      if (!result) return c.json({ error: 'Convênio não encontrado' }, 404);
      return c.json({ data: result });
    } catch (e) {
      console.error('[Financial/Convenios] Update error:', e);
      return c.json({ error: 'Erro ao atualizar convênio' }, 500);
    }
  });

  app.delete('/convenios/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    try {
      const [result] = await db.update(convenios).set({ deletedAt: new Date() })
        .where(and(
          eq(convenios.id, id),
          eq(convenios.organizationId, user.organizationId)
        ))
        .returning();

      if (!result) return c.json({ error: 'Convênio não encontrado' }, 404);
      return c.json({ ok: true });
    } catch (e) {
      console.error('[Financial/Convenios] Delete error:', e);
      return c.json({ error: 'Erro ao deletar convênio' }, 500);
    }
  });
};
