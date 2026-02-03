const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@sanity/client');

const app = express();
app.use(express.json({ limit: '50mb' }));

// 1. Initialize Sanity Client
const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: 'production',
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2026-02-02',
  useCdn: false
});

// 2. Startup Debug Logs
console.log("🛠 Checking Environment Variables...");
console.log("Project ID:", process.env.SANITY_PROJECT_ID);
if (process.env.SANITY_API_TOKEN) {
  console.log("Token detected! Starts with:", process.env.SANITY_API_TOKEN.substring(0, 4));
} else {
  console.error("❌ ERROR: SANITY_API_TOKEN is missing!");
}

app.post('/publish', async (req, res) => {
  try {
    const { _id, title, content } = req.body;
    const finalId = (_id && _id.startsWith('drafts.')) ? _id : `drafts.${crypto.randomUUID()}`;

    console.log(`Processing Draft: ${title} | ID: ${finalId}`);

    const bodyBlocks = [];

    for (const item of content) {
      const blockKey = crypto.randomBytes(6).toString('hex'); // Unique key for Sanity

      if (item.type === 'text') {
        bodyBlocks.push({
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [{ _type: 'span', _key: blockKey + '-s', text: item.value }]
        });
      } else if (item.type === 'image') {
        const buffer = Buffer.from(item.base64, 'base64');
        const asset = await sanity.assets.upload('image', buffer, {
          contentType: item.contentType || 'image/png',
          filename: `${finalId}-image`
        });
        
        bodyBlocks.push({
          _type: 'image',
          _key: blockKey,
          asset: { _type: 'reference', _ref: asset._id }
        });
      }
    }

    const result = await sanity.createOrReplace({
      _type: 'post',
      _id: finalId,
      title: title,
      body: bodyBlocks
    });

    res.status(200).json({ 
        status: "success", 
        id: result._id 
    });

  } catch (err) {
    console.error("Sanity Push Error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Railway Server Online on Port ${PORT}`);
});
