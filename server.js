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

// --- 3. COMPILE SCHEMA (Tells parser how to handle content) ---
const defaultSchema = Schema.compile({
  name: 'messariSchema',
  types: [{
    type: 'object',
    name: 'researchArticle',
    fields: [{ name: 'content', type: 'array', of: [{ type: 'block' }] }]
  }]
});
const blockContentType = defaultSchema.get('researchArticle').fields.find(f => f.name === 'content').type;

// --- 4. THE PUBLISH ROUTE ---
app.post('/api/publish', async (req, res) => {
  try {
    const { html, title } = req.body;
    console.log(`🚀 Processing: ${title}`);

    // Convert HTML to Sanity Blocks
    const blocks = htmlToBlocks(html, blockContentType, {
      parseHtml: (html) => new JSDOM(html).window.document
    });

    // Create the document as a DRAFT
    const doc = await sanity.create({
      // This line is the secret to making it a draft:
      _id: `drafts.gdoc-${Date.now()}`, 
      _type: 'researchArticle',
      title: title,
      content: blocks,
      
      subscriptionTier: 'enterprise', 
      type: 'enterprise_research',    
      publishDate: new Date().toISOString(),
      
      slug: {
        _type: 'slug',
        current: title.toLowerCase().replace(/\s+/g, '-').slice(0, 180) + '-' + Math.floor(Date.now() / 1000)
      },

      authors: [
        {
          _key: `author_${Date.now()}`,
          _type: 'reference',
          _ref: '56a1a926-f1b6-473f-b865-427f97ad84ed' 
        }
      ],
      category: {
        _type: 'reference',
        _ref: '238a45f6-defd-4437-874e-9cc5d054d423' 
      },

      aiSummary: "Draft generated via Google Docs Bridge."
    });

    console.log(`✅ Success! Draft Created: ${doc._id}`);
    res.json({ success: true, id: doc._id });
  } catch (err) {
    console.error("--- SANITY REJECTION DETAILS ---");
    console.error("Status:", err.statusCode);
    console.error("Message:", err.message);
    if (err.details) {
      console.error("Details:", JSON.stringify(err.details, null, 2));
    }
    res.status(500).json({ error: err.message, details: err.details });
  }
});
// --- 5. START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🛰️ Messari Bridge live on ${PORT}`));
