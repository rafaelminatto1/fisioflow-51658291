import { Context, Next } from "hono";
import { z } from "zod";

/**
 * Middleware de validação de input usando Zod.
 * Garante que o body da requisição siga o schema esperado.
 */
export const validate = (schema: z.ZodSchema) => {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const result = schema.safeParse(body);

      if (!result.success) {
        return c.json(
          {
            error: "Erro de validação",
            code: "VALIDATION_ERROR",
            details: result.error.format(),
          },
          400,
        );
      }

      // Armazena o body validado no context para uso posterior
      c.set("validatedBody", result.data);
      await next();
    } catch (error) {
      return c.json(
        {
          error: "Body inválido ou malformado",
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Erro ao processar JSON",
        },
        400,
      );
    }
  };
};

/**
 * Middleware para validar parâmetros de URL (UUID).
 */
export const validateId = (paramName: string = "id") => {
  const uuidSchema = z.string().uuid();
  return async (c: Context, next: Next) => {
    const id = c.req.param(paramName);
    const result = uuidSchema.safeParse(id);

    if (!result.success) {
      return c.json(
        {
          error: "ID inválido",
          code: "INVALID_ID",
          message: `O parâmetro ${paramName} deve ser um UUID válido.`,
        },
        400,
      );
    }

    await next();
  };
};
