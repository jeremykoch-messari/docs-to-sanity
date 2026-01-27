const express = require('express');
const { createClient } = require('@sanity/client');
const { JSDOM } = require('jsdom');
const app = express();

// Set high limits for big research reports
app.use(express.json({ limit: '100mb' })); 

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
    const elements = Array.from(dom.window.document.body.querySelectorAll('p, h1, h2, h3, img'));
    const blocks = [];

    console.log(`Processing report: ${title} with ${images?.length || 0} images.`);

    // 1. Upload all images to Sanity first
    const assetIds = [];
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const buffer = Buffer.from(images[i], 'base64');
        const asset = await sanity.assets.upload('image', buffer, {
          filename: `tron-q4-chart-${i}.png`
        });
        assetIds.push(asset._id);
      }
    }

    // 2. Map Elements to Portable Text
    let imgIdx = 0;
    elements.forEach((el) => {
      const tagName = el.tagName.toLowerCase();
      const text = el.textContent.trim();

      if (tagName === 'img' || text === '[IMAGE_PLACEHOLDER]') {
        if (assetIds[imgIdx]) {
          blocks.push({
            _type: 'image',
            _key: `img_${Date.now()}_${imgIdx}`,
            asset: { _type: 'reference', _ref: assetIds[imgIdx] }
          });
          imgIdx++;
        }
      } else if (text) {
        blocks.push({
          _type: 'block',
          _key: `block_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          style: tagName.startsWith('h') ? tagName : 'normal',
          children: [{ _type: 'span', text: text }]
        });
      }
    });

    const doc = await sanity.create({
      _id: `drafts.report-${Date.now()}`,
      _type: 'researchArticle',
      title: title,
      content: blocks
    });

    res.json({ success: true, id: doc._id, blockCount: blocks.length });
  } catch (err) {
    console.error("Bridge Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/publish', (req, res) => res.send("BRIDGE_READY"));
app.listen(process.env.PORT || 3000);
