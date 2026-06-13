import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { query } from "../../shared/utils/connecting.js";
import { embedText } from "../../modules/embeddings/proccess_embedding_pdf.js" 


function logGeminiError(context, error) {
  console.error(`[Gemini] ${context}:`, error);
  if (error?.cause) {
    console.error(`[Gemini] ${context} cause:`, {
      name: error.cause.name,
      message: error.cause.message,
      code: error.cause.code,
      errno: error.cause.errno,
      syscall: error.cause.syscall,
      hostname: error.cause.hostname,
    });
  }
}


// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",
  generationConfig: { temperature: 0.4 } 
});

export async function titleCreation(message){
  const prompt = `You are getting a message from a chat, which you use to create a fitting title for the entire chat
                  This is the message ${message}. Limit the title to 4-5 words`;
  try {
    const result = await model.generateContent(prompt);
    const answer = result.response.text();
    return answer
  } catch (error) {
    logGeminiError('titleCreation failed', error);
    throw error;
  }
}

export async function dbprompt({ user_id, prompt }) {
  try {
    const promptVector = await embedText(prompt);
    const vectorString = `[${promptVector.join(",")}]`;

const chunkResults = await query(`
    SELECT
      emb.chunk_text,
      emb.document_id,
      doc.original_filename,
      COALESCE(cat.name, doc.ai_suggested_category, 'unknown') AS category,
      doc.created_at,
      (emb.embedding <=> $2::vector) AS distance
    FROM embeddings emb
    JOIN documents doc ON emb.document_id = doc.id
    LEFT JOIN categories cat ON doc.category_id = cat.id
    WHERE emb.user_id = $1
      AND (emb.embedding <=> $2::vector) < 0.85
    ORDER BY emb.embedding <=> $2::vector
    LIMIT 5`, [user_id, vectorString]);


    if (chunkResults.rows.length === 0) {
      return { answer: "No documents found for this user.", sources: [] };
    }

    const contextData = chunkResults.rows
      .map(row => row.chunk_text)
      .join("\n\n---\n\n");

const finalPrompt = `
You are the document assistant for Dokumentenretter, a personal document management app.
The user has uploaded documents (invoices, contracts, medical records, tax forms, letters, etc.)
that have been OCR-scanned and stored. You help them understand and find information in their documents.
If the User asks for something about the content, answer it without hesitation. If it is about something not in the text but may be in relation to the topic also answer it.

Rules:
- Answer based ONLY on the provided context. Never invent document content.
- If the context doesn't contain enough information, say so clearly and suggest what the user could upload or search for instead.
- When you reference information, mention which document it comes from (filename and category).
- If the user asks in German, answer in German. Match the user's language.
- For financial amounts, dates, or legal terms, quote them exactly as they appear in the context.

Context from the user's documents:
${contextData}

User question:
${prompt}
`;

    const result = await model.generateContent(finalPrompt);
    const answer = result.response.text();

    return {
      answer,
      sources: [...new Set(chunkResults.rows.map(r => r.document_id))]
    };
  } catch (error) {
    logGeminiError('dbprompt failed', error);
    throw error;   // so user.js also knows that something went wrong
  }
}