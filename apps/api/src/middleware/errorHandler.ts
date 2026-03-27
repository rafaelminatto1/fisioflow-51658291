import type { MiddlewareHandler, ErrorHandler } from 'hono';

export const globalErrorHandler: ErrorHandler = (err, c) => {
  console.error(`[GlobalError] ${c.req.method} ${c.req.url}`, err);

  const isDev = c.env?.ENVIRONMENT === 'development';
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'Ocorreu um erro interno no servidor.';
  
  // Tratamento de erros do Zod (se aplicável futuramente)
  if (err.name === 'ZodError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Erro de validação nos dados fornecidos.';
  } else if (err.message.includes('não encontrado')) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = err.message;
  } else if (err.message.includes('obrigatório') || err.message.includes('inválido')) {
    statusCode = 400;
    errorCode = 'BAD_REQUEST';
    message = err.message;
  } else if (err.message.includes('Unauthorized') || err.message.includes('Token')) {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Não autorizado ou token inválido.';
  } else if (err.message.includes('Conflito') || err.message.includes('excedida')) {
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = err.message;
  }

  // Se o próprio handler já setou um status de erro, usamos ele (ex: c.json({...}, 400))
  // Mas como este é o middleware de captura final (exceptions throwed), vamos confiar
  // na lógica de mapeamento acima.

  return c.json(
    {
      success: false,
      error: {
        code: errorCode,
        message: message,
        // Envia a stack trace apenas em ambiente local/dev para segurança
        ...(isDev && { details: err.message, stack: err.stack }),
      },
    },
    statusCode as any
  );
};
