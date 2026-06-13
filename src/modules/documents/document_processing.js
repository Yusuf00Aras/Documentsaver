import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../../shared/utils/connecting.js';
import { extractText } from '../embeddings/proccess_embedding_pdf.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
  },
});

// Defines where the physical files will be stored on the server
const UPLOAD_DIR = path.resolve(process.env.STORAGE_PATH || './uploads');

//For document comparison to guard against duplicates
function getFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
// Helper function for categories
async function fetchCategories() {
  const result = await query(`SELECT name FROM categories ORDER BY name`);
  return result.rows.map(r => r.name);
}

export async function getAiAssessment(text) {
  const categories = await fetchCategories();
  const categoryList = categories.join(', ');

  const prompt = `Perform a semantic analysis of the provided text and output the results as a structured JSON object with:
    - ai_suggested_category: You MUST choose exactly one from this list: [${categoryList}]. Do NOT invent a new category.
    - ai_confidence: Provide a confidence score as a float between 0.0 and 1.0.
    - tags: Generate notable entities or thematic keywords extracted from the text.


  Text: ${text}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    return JSON.parse(response);
  } catch (error) {
    console.error('Message:', error.message);
    return {
      ai_suggested_category: null,
      ai_confidence: 0,
      tags: [],
    };
  }
}

export function getContentInfos(file, data) {
  const title = data.info?.Title?.trim() || file.originalname.replace(/\.pdf$/i, '');
  const page_count = data.numpages ?? 1;
  return { title, page_count };
}

// Updated to accept the generated savedPath
export function getDocumentInfos(file, savedPath, pdfPath = null) {
  return {
    original_filename: file.originalname,
    original_path: savedPath, // Now stores the actual disk path!
    file_size_bytes: file.size,
    mime_type: file.mimetype,
    pdf_path: pdfPath,
  };
}

// NEW: Helper function to write the memory buffer to the disk
export async function saveFileToDisk(file) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  
  // Clean the original filename to prevent issues with spaces/special characters
  const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  // Generate a unique path: e.g., uploads/123e4567-e89b-12d3-a456-426614174000-rechnung.pdf
  const uniqueFilename = `${crypto.randomUUID()}-${safeFilename}`;
  const savePath = path.join(UPLOAD_DIR, uniqueFilename);
  
  // Write the file buffer from memory to the hard drive
  await fs.writeFile(savePath, file.buffer);
  
  // Return the relative path so the frontend can request it later
  const folderName = path.basename(UPLOAD_DIR);
  return `/${folderName}/${uniqueFilename}`;
}
export async function getUserDocuments(userId) {
  const result = await query(`
    SELECT 
      id, 
      original_filename as name, 
      original_path,
      file_size_bytes, 
      created_at,
      title,
      tags,
      ai_suggested_category
    FROM documents 
    WHERE user_id = $1 
    ORDER BY created_at DESC
  `, [userId]);
  
  return result.rows;
}

export async function getDocumentPath(documentId) {
  const docResult = await query(
    `SELECT original_path FROM documents WHERE id = $1`, 
    [documentId]
  );
  
  if (docResult.rows.length === 0) return null;
  return docResult.rows[0].original_path;
}
// cascaded also deletes embeddings
export async function deleteDocumentRecord(documentId) {
  await query(`DELETE FROM documents WHERE id = $1`, [documentId]);
}

export async function storeFileData(file, userId) {
  // 0. Duplicate check via hash
  const fileHash = getFileHash(file.buffer);
  const duplicate = await query(
    'SELECT id, original_filename FROM documents WHERE user_id = $1 AND file_hash = $2',
    [userId, fileHash]
  );
  if (duplicate.rows.length > 0) {
    const existing = duplicate.rows[0].original_filename;
    throw new Error(`DUPLICATE: This document already exists as "${existing}"`);
  }

  // 1. Save the file to the disk first
  let savedPath;
  try {
    savedPath = await saveFileToDisk(file);
  } catch (err) {
    console.error('Error saving the file to disk:', err.message);
    throw new Error('File could not be saved.');
  }

  // 2. Process everything else
  const docInfos = getDocumentInfos(file, savedPath);
  const data = await extractText(file);
  const text = data.text.replace(/\x00/g, '');
  const content = getContentInfos(file, data);
  const result = await getAiAssessment(text);

  try {
    const contents = await query(
      `INSERT INTO documents (
          user_id, original_filename, original_path, mime_type,
          file_size_bytes, pdf_path, extracted_text,
          ai_suggested_category, ai_confidence, title, tags,
          page_count, file_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        userId, docInfos.original_filename, docInfos.original_path,
        docInfos.mime_type, docInfos.file_size_bytes, docInfos.pdf_path,
        text, result.ai_suggested_category, result.ai_confidence,
        content.title, result.tags, content.page_count, fileHash
      ]
    );
    return contents.rows[0].id;
  } catch (error) {
    console.error('Message:', error.message);
    throw error;
  } finally {
    console.log('SAVES DATA SUCCESSFUL IN DOCUMENTS');
  }
}


export async function getCategories() {
  const result = await query(`SELECT id, name FROM categories ORDER BY name`);
  return result.rows;
}

export async function updateDocumentCategory(documentId, category) {
  await query(
    `UPDATE documents SET ai_suggested_category = $1 WHERE id = $2`,
    [category, documentId]
  );
}