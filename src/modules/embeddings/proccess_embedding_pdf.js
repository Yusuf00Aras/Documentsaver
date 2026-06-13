import pdf from 'pdf-parse/lib/pdf-parse.js';
import { query } from '../../shared/utils/connecting.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const storeDocumentWithEmbeddings = async (file, docId, userId) => {
    const data = await extractText(file);
    const text = data.text.replace(/\x00/g, '');
    const chunks = chunkText(text);

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < chunks.length; i++) {
        try {
            const vector = await embedText(chunks[i]);
            const vectorString = `[${vector.join(',')}]`;

            await query(
                `INSERT INTO embeddings (user_id, document_id, chunk_text, chunk_index, embedding) 
                VALUES ($1, $2, $3, $4, $5)`,
                [userId, docId, chunks[i], i, vectorString]
            );
            console.log(`Chunk ${i}: Embedding successful`);
        } catch (error) {
            console.error(`Chunk ${i} failed:`, error.message);
        }
        await sleep(1000);
    }

    return docId;
};

// Revised function with 30 words of overlap
export function chunkText(text, wordsPerChunk = 150, overlap = 30) {
    const words = text.trim().split(/\s+/); // .trim() added
    const chunks = [];

    if (words.length <= wordsPerChunk) {
        return [text];
    }

    // The loop no longer advances by a full 150 but subtracts the overlap
    for (let i = 0; i < words.length; i += (wordsPerChunk - overlap)) {
        const chunk = words.slice(i, i + wordsPerChunk).join(' ');
        chunks.push(chunk);

        if (i + wordsPerChunk >= words.length) {
            break;
        }
    }

    return chunks;
}

export async function extractText(file) {
    const data = await pdf(file.buffer); 
    return data;
}

export const embedText = async (text) => {
    // Switched to a newer, better model
    const model = ai.getGenerativeModel({ model: 'gemini-embedding-001' });
    const response = await model.embedContent(text);
   

    return response.embedding.values;
}