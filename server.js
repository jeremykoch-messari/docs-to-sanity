const express = require('express');
const { createClient } = require('@sanity/client');
const { JSDOM } = require('jsdom');
const { htmlToBlocks } = require('@sanity/block-tools');
const { Schema } = require('@sanity/schema');

const app = express();
app.use(express.json({ limit: '50mb' }));

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false
});

// Parser schema for links and headings
const defaultSchema = Schema.compile({
  name: 'messariSchema',
  types: [{
    type: 'object',
    name: 'researchArticle',
    fields: [{ name: 'content', type: 'array', of: [{ type: 'block' }] }]
  }]
});
const blockContentType = defaultSchema.get('researchArticle').fields.find(f => f.name === 'content').type;

app.post('/api/publish', async (req, res) => {
  try {
    const { html, title } = req.body;
    console.log(`🚀 Creating Draft for: ${title}`);
    
    const blocks = htmlToBlocks(html, blockContentType, {
      parseHtml: (html) => new JSDOM(html).window.document
    });

    // The logic that worked: Minimal fields.
    // To ensure it's a draft, we use the .create() method but 
    // we prefix the ID inside the create call.
    const doc = await sanity.create({
      _id: `drafts.${Math.floor(Date.now() / 1000)}`, // Manual draft ID
      _type: 'researchArticle',
      title: title,
      content: blocks
    });

    console.log(`✅ Success! Draft Created with ID: ${doc._id}`);
    res.json({ success: true, id: doc._id });
  } catch (err) {
    console.error("DEBUG ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Messari Bridge live on ${PORT}`));
