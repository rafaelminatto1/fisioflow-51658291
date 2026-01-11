
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.error('API Key not found');
    process.exit(1);
}

const generateToken = (apiKey: string) => {
    const [id, secret] = apiKey.split('.');
    const payload = {
        api_key: id,
        exp: Math.floor(Date.now() / 1000) + 3600,
        timestamp: Math.floor(Date.now() / 1000),
    };

    // Zhipu specific header
    return jwt.sign(payload, secret, {
        algorithm: 'HS256',
        header: { alg: 'HS256', sign_type: 'SIGN' }
    });
};

async function testModel(modelName: string) {
    try {
        const token = generateToken(apiKey!);
        console.log(`Testing model: ${modelName}`);

        const response = await axios.post(
            'https://open.bigmodel.cn/api/paas/v4/embeddings',
            {
                model: modelName,
                input: 'Test embedding string'
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const embedding = response.data.data[0].embedding;
        console.log(`✅ Success! Model: ${modelName}`);
        console.log(`📏 Dimension: ${embedding.length}`);
        return true;
    } catch (error: any) {
        console.error(`❌ Failed ${modelName}:`, error.response?.data || error.message);
        return false;
    }
}

async function testChat() {
    try {
        const token = generateToken(apiKey!);
        console.log(`Testing Chat: glm-4`);

        const response = await axios.post(
            'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            {
                model: 'glm-4',
                messages: [{ role: 'user', content: 'Hello' }]
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`✅ Success! Chat response: ${response.data.choices[0].message.content.substring(0, 50)}...`);
        return true;
    } catch (error: any) {
        console.error(`❌ Failed Chat:`, error.response?.data || error.message);
        return false;
    }
}

async function main() {
    await testModel('embedding-2');
    await testChat();
    // Legacy / Alternative models
    await testModel('text_embedding');
    await testChatWithModel('glm-3-turbo');
    await testChatWithModel('chatglm_turbo');
}

async function testChatWithModel(model: string) {
    try {
        const token = generateToken(apiKey!);
        console.log(`Testing Chat: ${model}`);
        const response = await axios.post(
            'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            { model: model, messages: [{ role: 'user', content: 'Hello' }] },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log(`✅ Success! ${model}: ${response.data.choices[0].message.content.substring(0, 20)}`);
    } catch (error: any) {
        console.error(`❌ Failed ${model}:`, error.response?.data?.error?.message || error.message);
    }
}

main();
