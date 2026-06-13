import 'dotenv/config';
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import fs from 'fs'
import path from 'path'
import { guestlogin } from '../modules/auth/guestlogin.js';
import { login, authenticateToken } from './../modules/auth/user.js'
import { dbprompt, titleCreation } from '../modules/chat/ChatEnvironment.js'
import { createConversation, addMessage, listConversations, listMessages, deleteConversation } from '../modules/chat/conversations.js'
import { upload } from './../shared/utils/upload.js'

// Import all required DB functions from the processing module
import { 
  storeFileData, 
  getUserDocuments, 
  getDocumentPath, 
  deleteDocumentRecord,
  getCategories,          
  updateDocumentCategory  
} from '../modules/documents/document_processing.js' 
import { storeDocumentWithEmbeddings } from '../modules/embeddings/proccess_embedding_pdf.js'

const app = express()
const PORT = process.env.PORT || 80
const storageFolder = path.basename(process.env.STORAGE_PATH || './uploads');

const requiredAuthEnvVars = ['REFRESH_TOKEN_SECRET', 'ACCESS_TOKEN_SECRET']
const missingAuthEnvVars = requiredAuthEnvVars.filter((name) => !process.env[name])

if (missingAuthEnvVars.length > 0) {
  throw new Error(`Missing required auth environment variables: ${missingAuthEnvVars.join(', ')}`)
}

function createFallbackTitle(prompt) {
  const cleanedPrompt = String(prompt ?? '').replace(/\s+/g, ' ').trim();
  if (!cleanedPrompt) {
    return 'New Chat';
  }

  return cleanedPrompt.split(' ').slice(0, 5).join(' ');
}

app.use(cors())
app.use(express.json())
app.use(cookieParser())

// Allows the frontend to access the PDFs (e.g. for the "View" button)
app.use(`/${storageFolder}`, express.static(storageFolder));
// ==========================================
// Guest Login
// ==========================================
app.post('/api/guestlogin', async (req,res)=>{
    try{
      const name = req.body?.name; //? fallback in case there is no body
      const guestName = typeof name === 'string' && name.trim() // checks whether it is empty or actually a string
        ? name.trim() // if valid use the name, otherwise a random name with Guest
        : `Guest-${Math.random().toString(36).slice(2, 8)}`;
      
      const user = await guestlogin(guestName)
      console.log(user)
      if (!user) return res.status(500).json({ error: 'Guest could not be created' });
    
          // Create the Refresh Token inside the server later for the browser
      const refreshToken = jwt.sign(
        { user_id: user.id, role: 'guest' }, 
        process.env.REFRESH_TOKEN_SECRET, 
        { expiresIn: '24h' }
      );

      //create the first accesstoken inside server 
      const accessToken = jwt.sign(
        { user_id: user.id, role: 'guest' }, 
        process.env.ACCESS_TOKEN_SECRET, 
        { expiresIn: '15m' }
      );

      // some rules of the refreshtoken to ensure no gets access to it
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true, // ONLY IN THE BROWSER COOKIE
        secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in prod
        sameSite: 'Strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      });

      return res.json({
        message: 'Guest login successful',
        accessToken,
        user: {
          id: user.id,
          full_name: user.display_name,
          role: 'guest'
        }
      });

    }catch(err){
      console.error('Guest login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
})

// ==========================================
// Login
// ==========================================
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await login(email, password);
    console.log(user)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create the Refresh Token inside the dserver
    const refreshToken = jwt.sign(
      { user_id: user.id }, 
      process.env.REFRESH_TOKEN_SECRET, 
      { expiresIn: '7d' }
    );

    //create the first accesstoken inside server 
    const accessToken = jwt.sign(
      { user_id: user.id }, 
      process.env.ACCESS_TOKEN_SECRET, 
      { expiresIn: '15m' }
    );

    // some rules of the refreshtoken to ensure no gets access to it
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // ONLY IN THE BROWSER COOKIE
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in prod
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });

    // sends the json with the accesstoken and user information
    return res.json({ message: 'Login successful', accessToken, user });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    //takes the refresh token from the cookies of the browser
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    //compares the refreshtoken from the browser to the env to make sure it is the same
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    //creates the short term token in the js for 15 min
    const accessToken = jwt.sign(
      { user_id: decoded.user_id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken });
  } catch (err) {
    console.error('Token refresh failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});


app.get('/api/auth/me', authenticateToken, (req, res) => {
  
  res.status(200).json({ 
    message: 'User authenticated successfully',
    user_id: req.user.user_id 
  }); 
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict'
  });
  res.json({ message: 'Logged out successfully' });
});
// ==========================================
// 💬 CHAT ROUTES
// ==========================================

// Fetch all conversations of a user for the sidebar
app.get('/api/conversations', authenticateToken,async (req, res) => {
  try {
    const user_id = req.user.user_id;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' })
    
    const list = await listConversations({ user_id })
    res.json(list)
  } catch (err) {
    console.error('listConversations error:', err)
    res.status(500).json({ error: 'failed to list conversations', detail: String(err.message ?? err) })
  }
})

// Fetch all messages of a specific conversation for the chat history
app.get('/api/conversations/:id/messages',authenticateToken, async (req, res) => {
  try {
    const { id: conversation_id } = req.params
    const user_id = req.user.user_id;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' })
    
    const messages = await listMessages({ conversation_id, user_id })
    res.json(messages)
  } catch (err) {
    console.error('listMessages error:', err)
    res.status(500).json({ error: 'failed to load messages', detail: String(err.message ?? err) })
  }
})

// Send a new chat message and generate the AI response
app.post('/api/chat', authenticateToken,async (req, res) => {
  try {
    let { conversation_id, prompt } = req.body ?? {}
    const user_id = req.user.user_id;
    if (!prompt) return res.status(400).json({ error: 'user_id and prompt are required' })

    if (!conversation_id) {  
      let Title;
      try {
        Title = await titleCreation(prompt)
      } catch (titleError) {
        console.error('Title creation failed, using fallback title:', titleError)
        Title = createFallbackTitle(prompt)
      }
      const newConv = await createConversation({ user_id, title: Title });
      conversation_id = newConv.id; 
    }

    const userMsg = await addMessage({ conversation_id, user_id, role: 'user', content: prompt })
    if (!userMsg) return res.status(404).json({ error: 'conversation not found or unauthorized' })

    const result = await dbprompt({ user_id, prompt })

    await addMessage({ 
      conversation_id, 
      user_id, 
      role: 'assistant', 
      content: result.answer, 
      source_chunks: result.sources ?? [] 
    })

    res.json({ ...result, conversation_id: conversation_id })
  } catch (err) {
    console.error('API Error:', err)
    res.status(500).json({ error: 'Internal server error', detail: String(err.message ?? err) })
  }
})

// Delete a chat
app.post('/api/chat/delete',authenticateToken, async(req,res)=> {
  try {
    let { conversation_id } = req.body ?? {}
    const user_id = req.user.user_id;
    if ( !conversation_id) return res.status(400).json({ error: 'user_id and conversation_id are required' })

    const feedback = await deleteConversation({conversation_id, user_id})
    if(feedback) {
      res.status(200).json({ message: 'Chat deleted successfully' })
    } else {
      res.status(400).json({ message: 'Chat not deleted' })
    }
  } catch (err) {
    console.error('API Error:', err)
    res.status(500).json({ error: 'Internal server error', detail: String(err.message ?? err) })
  }
})

// ==========================================
// 📁 DOCUMENT ROUTES
// ==========================================

// Upload a PDF, process it and generate embeddings
app.post('/api/upload', authenticateToken ,upload.single('file'), async (req, res) => {
  try {
    const file = req.file; 
     const user_id = req.user.user_id;
    
    if (!file) return res.status(400).json({ error: 'No file uploaded or invalid file type' });
    if (!user_id) return res.status(400).json({ error: 'user_id is missing' });
    
    console.log(`Processing PDF: ${file.originalname} for user: ${user_id}`);
    
    const docId = await storeFileData(file, user_id);
    await storeDocumentWithEmbeddings(file, docId, user_id);
    
    res.status(200).json({ message: 'Upload and processing successful!', document_id: docId });
  } catch (error) {
    if (error.message.startsWith('DUPLICATE:')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error during processing' });
  }
});

// Fetch all documents for a user (without the huge extracted_text)
app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Call the extracted DB logic
    const rows = await getUserDocuments(user_id);

    // Format the data for the frontend
    const files = rows.map(row => ({
      id: row.id,
      name: row.title || row.name,
      created_at: row.created_at,
      size: row.file_size_bytes,
      tags: row.tags,
      category: row.ai_suggested_category,
      url: `/${storageFolder}/${path.basename(row.original_path)}`
    }));

    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a document from the DB and from disk
app.delete('/api/files/:id', authenticateToken,async (req, res) => {
  try {
    const documentId = req.params.id;

    // 1. Get the relative path via the extracted function
    const relativePath = await getDocumentPath(documentId);
    if (!relativePath) return res.status(404).json({ error: 'Document not found' });

    // 2. Delete the database records via the extracted function
    await deleteDocumentRecord(documentId);

    // 3. Delete the physical file
    try {
      const absolutePath = path.join(process.cwd(), relativePath);
      await fs.promises.unlink(absolutePath);
      console.log(`Deleted from disk: ${absolutePath}`);
    } catch (fsError) {
      console.error('File could not be deleted from disk (maybe already gone):', fsError.message);
    }

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Fetch categories for the user
app.get('/api/categories',authenticateToken, async (req, res) => {
  try {
    res.json(await getCategories());
  } catch (err) {
    res.status(500).json({ error: 'Categories could not be loaded.' });
  }
});

// Update category
app.patch('/api/files/:id/category',authenticateToken, async (req, res) => {
  try {
    await updateDocumentCategory(req.params.id, req.body.category);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Category could not be set.' });
  }
});

app.use(express.static('dist'));

app.get('*', (req, res) => {
  res.sendFile(path.resolve('dist', 'index.html'));
});
// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, '0.0.0.0', function () {
  const actualPort = this.address().port
  console.log(`Server running on http://0.0.0.0:${actualPort}`)
})