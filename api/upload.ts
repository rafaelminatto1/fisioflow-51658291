import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                // In a real app, you should check authentication here!
                // For example, verify Supabase session from cookies/headers

                return {
                    allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'],
                    tokenPayload: JSON.stringify({
                        // optional payload
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log('Blob uploaded:', blob.url);
            },
        });

        return new Response(JSON.stringify(jsonResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
        });
    }
}
