const express = require('express');
const { createClient } = require('@sanity/client');
const { JSDOM } = require('jsdom');
const app = express();

// The "Magic Line" that allows big TRON reports
app.use(express.json({ limit: '50mb' })); 

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

app.post('/api/publish', async (req, res) => {
  try {
    const { html, title, images } = req.body;
    const dom = new JSDOM(html);
    const elements = Array.from(dom.window.document.body.children);
    const blocks = [];

    // 1. Upload Images to Sanity Library
    const assetIds = [];
    if (images && images.length > 0) {
      for (const base64 of images) {
        const buffer = Buffer.from(base64, 'base64');
        const asset = await sanity.assets.upload('image', buffer);
        assetIds.push(asset._id);
      }
    }

    // 2. Map Text and Images in Sequence
    let imgIdx = 0;
    elements.forEach(el => {
      const tagName = el.tagName.toLowerCase();
      if (tagName === 'img' || el.textContent.includes('[IMAGE_PLACEHOLDER]')) {
        if (assetIds[imgIdx]) {
          blocks.push({
            _type: 'image',
            _key: Math.random().toString(36).slice(2, 9),
            asset: { _type: 'reference', _ref: assetIds[imgIdx++] }
          });
        }
      } else if (el.textContent.trim()) {
        blocks.push({
          _type: 'block',
          _key: Math.random().toString(36).slice(2, 9),
          style: tagName.startsWith('h') ? tagName : 'normal',
          children: [{ _type: 'span', text: el.textContent.trim() }]
        });
      }
    });

    const doc = await sanity.create({
      _id: `drafts.tron-${Date.now()}`,
      _type: 'researchArticle',
      title: title,
      content: blocks
    });

    res.json({ success: true, id: doc._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/publish', (req, res) => res.send("RAILWAY_BRIDGE_ONLINE"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
