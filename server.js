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
if (process.env.SANITY_API_TOKEN) {
  console.log("Token detected! Starts with:", process.env.SANITY_API_TOKEN.substring(0, 4));
} else {
  console.error("❌ ERROR: SANITY_API_TOKEN is missing!");
}

app.post('/publish', async (req, res) => {
  try {
    const { _id, title, content } = req.body;
    // We use researchArticle as the type based on your JSON inspection
    const finalId = (_id && _id.startsWith('drafts.')) ? _id : `drafts.${crypto.randomUUID()}`;

    console.log(`Processing Draft: ${title} | ID: ${finalId}`);

    const bodyBlocks = [];

    for (const item of content) {
      const blockKey = crypto.randomBytes(6).toString('hex');

     if (item.type === 'text') {
        const children = [];
        const markDefs = [];

        // Loop through the segments sent from Google Docs
        item.segments.forEach((seg, idx) => {
          const spanKey = `${blockKey}-${idx}`;
          const marks = [];

          // If the segment has a link, create a mark definition
          if (seg.link) {
            const linkKey = `link-${crypto.randomBytes(4).toString('hex')}`;
            marks.push(linkKey);
            markDefs.push({
              _key: linkKey,
              _type: 'link',
              href: seg.link
            });
          }

          children.push({
            _type: 'span',
            _key: spanKey,
            marks: marks,
            text: seg.text
          });
        });

        bodyBlocks.push({
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: markDefs,
          children: children
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
    

    // MATCHING YOUR SCHEMA: _type -> researchArticle, content field -> content
    const result = await sanity.createOrReplace({
      _type: 'researchArticle', 
      _id: finalId,
      title: title,
      content: bodyBlocks // Changed from 'body' to 'content'
    });

    console.log("✅ Sanity Sync Complete:", result._id);

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
