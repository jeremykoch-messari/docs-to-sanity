const express = require('express');
const { createClient } = require('@sanity/client');
const { JSDOM } = require('jsdom');
const { htmlToBlocks } = require('@sanity/block-tools');
const { Schema } = require('@sanity/schema');

// --- 1. INITIALIZE APP ---
const app = express();
app.use(express.json({ limit: '50mb' })); 

// --- 2. YOUR SANITY CONFIG ---
const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false
});

// --- 3. COMPILE SCHEMA (For Sanity Parsing) ---
const defaultSchema = Schema.compile({
  name: 'myBlog',
  types: [{
    type: 'object',
    name: 'blogPost',
    fields: [{ name: 'content', type: 'array', of: [{ type: 'block' }] }]
  }]
});
const blockContentType = defaultSchema.get('blogPost').fields.find(f => f.name === 'content').type;

// --- 4. THE PUBLISH ROUTE ---
app.post('/api/publish', async (req, res) => {
  try {
    const { html, title, images } = req.body;
    console.log(`🚀 Processing Report: ${title}`);

    // Convert HTML to Sanity Blocks
    const blocks = htmlToBlocks(html, blockContentType, {
      parseHtml: (html) => new JSDOM(html).window.document
    });

    // Create the document in Sanity
    const doc = await sanity.create({
      _type: 'researchArticle', 
      title: title,
      content: blocks,
      publishedAt: new Date().toISOString()
    });

    console.log(`✅ Success! Published as ID: ${doc._id}`);
    res.json({ success: true, id: doc._id });
  } catch (err) {
    console.error("❌ Bridge Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- 5. START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🛰️ Messari Bridge live on port ${PORT}`));
