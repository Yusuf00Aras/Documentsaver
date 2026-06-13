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


    const hasContext = chunkResults.rows.length > 0;

    const contextData = hasContext
      ? chunkResults.rows
          .map(row => row.chunk_text)
          .join("\n\n---\n\n")
      : "(No matching documents were found for this question.)";

const finalPrompt = `
You are the document assistant for Dokumentenretter, a personal document management app.
The user has uploaded documents (invoices, contracts, medical records, tax forms, letters, etc.)
that have been OCR-scanned and stored. Your main job is to help them understand and find
information in their documents, but you are also a friendly, helpful conversational assistant.

How to respond:
- If the message is a greeting, small talk, or a general question (e.g. "hey", "how are you",
  "what can you do?"), reply naturally and briefly. Do NOT mention documents unless it's relevant.
  Feel free to let the user know you can help them search and understand their uploaded documents.
- If the message is about the content of the user's documents, answer using the provided context.
- If the user asks something document-related but the context is empty or insufficient, say so
  clearly and suggest what they could upload or search for instead. Never invent document content.
- For general knowledge questions not related to the documents, answer helpfully from your own
  knowledge, and make clear it is general information (not from their documents).

Rules:
- Never invent or fabricate the content of the user's documents.
- When you reference information from a document, mention which document it comes from
  (filename and category).
- Match the user's language: if they write in German, answer in German; otherwise answer in English.
- For financial amounts, dates, or legal terms, quote them exactly as they appear in the context.

Context from the user's documents:
${contextData}

User message:
${prompt}
`;

    const result = await model.generateContent(finalPrompt);
    const answer = result.response.text();

    return {
      answer,
      sources: hasContext
        ? [...new Set(chunkResults.rows.map(r => r.document_id))]
        : []
    };
  } catch (error) {
    logGeminiError('dbprompt failed', error);
    throw error;   // so user.js also knows that something went wrong
  }
}