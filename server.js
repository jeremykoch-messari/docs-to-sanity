const express = require('express');
const { createClient } = require('@sanity/client');
const { JSDOM } = require('jsdom');
const { htmlToBlocks } = require('@sanity/block-tools');
const { Schema } = require('@sanity/schema');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '50mb' }));

const sanity = createClient({
  projectId: '2bt0j8lu',
  dataset: 'production',
  token: 'skhAwXxe5rwEW10O9mNYCDUKuXBSlqbpgLb3qVip4qIXF2693V9wCXeZHNZrhFAK2HV0yseJrFw3PMIygzibpXZdnkX9Hu3YXE43KOCrtCtuuEj3Xoq1sViY4OSTCcjmiJWUl55DOoDQXvQlfezrHkw1HnIRVTslrepyY7plWsaPgoF0pTTT',
  apiVersion: '2023-05-03',
  useCdn: false
});

// Setup Schema for HTML Parsing
const defaultSchema = Schema.compile({
  name: 'messari',
  types: [{ type: 'object', name: 'researchArticle', fields: [{ name: 'content', type: 'array', of: [{ type: 'block' }, { type: 'image' }] }] }]
});
const blockContentType = defaultSchema.get('researchArticle').fields.find(f => f.name === 'content').type;

app.post('/api/publish', async (req, res) => {
  try {
    const { title, html, images } = req.body;
    console.log('🚀 Processing: ' + title);

    // 1. Parse HTML (This gets your text AND links perfectly)
    const blocks = htmlToBlocks(html, blockContentType, {
      parseHtml: (html) => new JSDOM(html).window.document
    });

    // 2. Append Images (Jan 27th style)
    if (images && Array.isArray(images)) {
      for (const base64 of images) {
        const asset = await sanity.assets.upload('image', Buffer.from(base64, 'base64'));
        blocks.push({
          _type: 'image',
          _key: crypto.randomUUID(),
          asset: { _type: 'reference', _ref: asset._id }
        });
      }
    }

    // 3. Create Draft with UUID
    const doc = await sanity.create({
      _id: 'drafts.' + crypto.randomUUID(),
      _type: 'researchArticle',
      title: title || 'New Research',
      content: blocks,
      subscriptionTier: 'enterprise',
      type: 'enterprise_research',
      publishDate: new Date().toISOString(),
      slug: { _type: 'slug', current: (title || 'report').toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() }
    });

    console.log('✅ Success! Created: ' + doc._id);
    res.json({ success: true, id: doc._id });

  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 8080);
