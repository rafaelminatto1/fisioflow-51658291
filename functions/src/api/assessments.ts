import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getPool } from '../init';
import { authorizeRequest } from '../middleware/auth';
import { AssessmentTemplate, AssessmentSection, PatientAssessment } from '../types/models';

/**
 * Lista templates de avaliação
 */
interface ListAssessmentTemplatesResponse {
  data: AssessmentTemplate[];
}

export const listAssessmentTemplates = onCall<{}, Promise<ListAssessmentTemplatesResponse>>(async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);

  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT
        id, name, description, category,
        is_global, display_order, is_active,
        created_at, updated_at
      FROM assessment_templates
      WHERE is_active = true
        AND (organization_id = $1 OR is_global = true)
      ORDER BY display_order, name`,
      [auth.organizationId]
    );

    return { data: result.rows as AssessmentTemplate[] };
  } catch (error: unknown) {
    console.error('Error in listAssessmentTemplates:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao listar templates';
    throw new HttpsError('internal', errorMessage);
  }
});

interface GetAssessmentTemplateRequest {
  templateId: string;
}

interface GetAssessmentTemplateResponse {
  data: AssessmentTemplate & { sections: (AssessmentSection & { questions: any[] })[] };
}

export const getAssessmentTemplate = onCall<GetAssessmentTemplateRequest, Promise<GetAssessmentTemplateResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { templateId } = request.data;

  if (!templateId) {
    throw new HttpsError('invalid-argument', 'templateId é obrigatório');
  }

  const pool = getPool();

  try {
    // Buscar template
    const templateResult = await pool.query(
      `SELECT * FROM assessment_templates
       WHERE id = $1
         AND is_active = true
         AND (organization_id = $2 OR is_global = true)`,
      [templateId, auth.organizationId]
    );

    if (templateResult.rows.length === 0) {
      throw new HttpsError('not-found', 'Template não encontrado');
    }

    const template = templateResult.rows[0];

    // Buscar seções
    const sectionsResult = await pool.query(
      `SELECT * FROM assessment_sections
       WHERE template_id = $1 AND is_active = true
       ORDER BY "order"`,
      [templateId]
    );

    // Buscar perguntas para todas as seções de uma vez (mais eficiente que loops independentes)
    const sectionIds = sectionsResult.rows.map((s: { id: string }) => s.id);
    let sectionsWithQuestions = sectionsResult.rows.map((s: any) => ({ ...s, questions: [] }));

    if (sectionIds.length > 0) {
      const questionsResult = await pool.query(
        `SELECT * FROM assessment_questions
         WHERE section_id = ANY($1) AND is_active = true
         ORDER BY section_id, "order"`,
        [sectionIds]
      );

      // Mapear perguntas para suas seções
      questionsResult.rows.forEach((q: { section_id: string }) => {
        const section = sectionsWithQuestions.find(s => s.id === q.section_id);
        if (section) section.questions.push(q);
      });
    }

    return {
      data: {
        ...template,
        sections: sectionsWithQuestions,
      },
    } as GetAssessmentTemplateResponse;
  } catch (error: unknown) {
    console.error('Error in getAssessmentTemplate:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar template';
    throw new HttpsError('internal', errorMessage);
  }
});

interface ListAssessmentsRequest {
  patientId: string;
  status?: string;
}

interface ListAssessmentsResponse {
  data: (PatientAssessment & { template_name: string; performer_name: string })[];
}

export const listAssessments = onCall<ListAssessmentsRequest, Promise<ListAssessmentsResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId, status } = request.data;

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = getPool();

  try {
    let query = `
      SELECT
        a.*,
        t.name as template_name,
        p.full_name as performer_name
      FROM patient_assessments a
      LEFT JOIN assessment_templates t ON a.template_id = t.id
      LEFT JOIN profiles p ON a.performed_by = p.user_id
      WHERE a.patient_id = $1
        AND a.organization_id = $2
    `;
    const params: (string | number)[] = [patientId, auth.organizationId];
    let paramCount = 2;

    if (status) {
      paramCount++;
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY a.assessment_date DESC, a.created_at DESC`;

    const result = await pool.query(query, params);

    return { data: result.rows as any[] };
  } catch (error: unknown) {
    console.error('Error in listAssessments:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao listar avaliações';
    throw new HttpsError('internal', errorMessage);
  }
});

interface GetAssessmentRequest {
  assessmentId: string;
}

interface GetAssessmentResponse {
  data: PatientAssessment & { responses: any[] };
}

export const getAssessment = onCall<GetAssessmentRequest, Promise<GetAssessmentResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { assessmentId } = request.data;

  if (!assessmentId) {
    throw new HttpsError('invalid-argument', 'assessmentId é obrigatório');
  }

  const pool = getPool();

  try {
    // Buscar avaliação
    const assessmentResult = await pool.query(
      `SELECT * FROM patient_assessments
       WHERE id = $1 AND organization_id = $2`,
      [assessmentId, auth.organizationId]
    );

    if (assessmentResult.rows.length === 0) {
      throw new HttpsError('not-found', 'Avaliação não encontrada');
    }

    const assessment = assessmentResult.rows[0];

    // Buscar respostas
    const responsesResult = await pool.query(
      `SELECT
        ar.*,
        q.question_text,
        q.answer_type,
        q.options
      FROM assessment_responses ar
      LEFT JOIN assessment_questions q ON ar.question_id = q.id
      WHERE ar.assessment_id = $1
      ORDER BY q.section_id, q.order`,
      [assessmentId]
    );

    return {
      data: {
        ...assessment,
        responses: responsesResult.rows,
      },
    } as GetAssessmentResponse;
  } catch (error: unknown) {
    console.error('Error in getAssessment:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar avaliação';
    throw new HttpsError('internal', errorMessage);
  }
});

interface CreateAssessmentRequest {
  patientId: string;
  templateId: string;
  title?: string;
  assessmentDate?: string;
  responses?: {
    question_id: string;
    answer_text?: string;
    answer_number?: number;
    answer_json?: any;
  }[];
}

interface CreateAssessmentResponse {
  data: PatientAssessment;
}

export const createAssessment = onCall<CreateAssessmentRequest, Promise<CreateAssessmentResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const {
    patientId,
    templateId,
    title,
    assessmentDate,
    responses,
  } = request.data;

  if (!patientId || !templateId) {
    throw new HttpsError('invalid-argument', 'patientId e templateId são obrigatórios');
  }

  const pool = getPool();

  try {
    // Verificar se template existe
    const templateCheck = await pool.query(
      `SELECT id FROM assessment_templates
       WHERE id = $1 AND is_active = true`,
      [templateId]
    );

    if (templateCheck.rows.length === 0) {
      throw new HttpsError('not-found', 'Template não encontrado');
    }

    // Iniciar transação
    await pool.query('BEGIN');

    try {
      // Criar avaliação
      const assessmentResult = await pool.query(
        `INSERT INTO patient_assessments (
          patient_id, template_id, title, assessment_date,
          performed_by, organization_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          patientId,
          templateId,
          title || 'Avaliação',
          assessmentDate || new Date().toISOString().split('T')[0],
          auth.userId,
          auth.organizationId,
          'completed',
        ]
      );

      const assessment = assessmentResult.rows[0];

      // Inserir respostas
      if (responses && Array.isArray(responses)) {
        for (const response of responses) {
          await pool.query(
            `INSERT INTO assessment_responses (
              assessment_id, question_id,
              answer_text, answer_number, answer_json
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              assessment.id,
              response.question_id,
              response.answer_text || null,
              response.answer_number || null,
              response.answer_json ? JSON.stringify(response.answer_json) : null,
            ]
          );
        }
      }

      await pool.query('COMMIT');

      // Publicar no Ably
      try {
        const realtime = await import('../realtime/publisher');
        await realtime.publishPatientUpdate(patientId, {
          type: 'assessment_created',
          assessmentId: assessment.id,
        });
      } catch (e) {
        console.error('Error publishing to Ably:', e);
      }

      return { data: assessment as PatientAssessment };
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
  } catch (error: unknown) {
    console.error('Error in createAssessment:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar avaliação';
    throw new HttpsError('internal', errorMessage);
  }
});

interface UpdateAssessmentRequest {
  assessmentId: string;
  responses?: {
    question_id: string;
    answer_text?: string;
    answer_number?: number;
    answer_json?: any;
  }[];
  [key: string]: any;
}

export const updateAssessment = onCall<UpdateAssessmentRequest, Promise<{ data: { success: boolean } }>>(async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { assessmentId, responses, ...updates } = request.data;

  if (!assessmentId) {
    throw new HttpsError('invalid-argument', 'assessmentId é obrigatório');
  }

  const pool = getPool();

  try {
    // Verificar se avaliação existe
    const existing = await pool.query(
      'SELECT * FROM patient_assessments WHERE id = $1 AND organization_id = $2',
      [assessmentId, auth.organizationId]
    );

    if (existing.rows.length === 0) {
      throw new HttpsError('not-found', 'Avaliação não encontrada');
    }

    // Iniciar transação
    await pool.query('BEGIN');

    try {
      // Atualizar campos da avaliação
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      const allowedFields = ['title', 'status', 'conclusion', 'recommendations', 'next_assessment_date'];

      for (const field of allowedFields) {
        if (field in updates) {
          paramCount++;
          setClauses.push(`${field} = $${paramCount}`);
          values.push(updates[field]);
        }
      }

      if (setClauses.length > 0) {
        paramCount++;
        setClauses.push(`updated_at = $${paramCount}`);
        values.push(new Date());

        values.push(assessmentId, auth.organizationId);

        await pool.query(
          `UPDATE patient_assessments
           SET ${setClauses.join(', ')}
           WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}`,
          values
        );
      }

      // Atualizar respostas se fornecidas
      if (responses && Array.isArray(responses)) {
        // Remover respostas antigas
        await pool.query('DELETE FROM assessment_responses WHERE assessment_id = $1', [
          assessmentId,
        ]);

        // Inserir novas respostas
        for (const response of responses) {
          await pool.query(
            `INSERT INTO assessment_responses (
              assessment_id, question_id,
              answer_text, answer_number, answer_json
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              assessmentId,
              response.question_id,
              response.answer_text || null,
              response.answer_number || null,
              response.answer_json ? JSON.stringify(response.answer_json) : null,
            ]
          );
        }
      }

      await pool.query('COMMIT');

      return { data: { success: true } };
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
  } catch (error: unknown) {
    console.error('Error in updateAssessment:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar avaliação';
    throw new HttpsError('internal', errorMessage);
  }
});
