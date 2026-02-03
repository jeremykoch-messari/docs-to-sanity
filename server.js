const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@sanity/client');

const app = express();
app.use(express.json({ limit: '50mb' }));

// 1. Initialize Sanity Client (DO THIS ONLY ONCE)
const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: 'production',
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2026-02-02',
  useCdn: false
});

// 2. DEBUG LOGS (To check if Railway is working)
console.log("🛠 Checking Environment Variables...");
console.log("Project ID:", process.env.SANITY_PROJECT_ID);
if (process.env.SANITY_API_TOKEN) {
  console.log("Token detected! Starts with:", process.env.SANITY_API_TOKEN.substring(0, 4));
} else {
  console.error("❌ ERROR: SANITY_API_TOKEN is missing!");
}

// 3. YOUR PUBLISH ROUTE
app.post('/publish', async (req, res) => {
// ... rest of the code

// ... the rest of your app.post('/publish'...) code


app.post('/publish', async (req, res) => {
  try {
    const { _id, title, content } = req.body;

    // 1. Ensure the ID follows the 'drafts.[UUID]' structure
    // We prioritize the ID sent from Google, but validate it here
    const finalId = (_id && _id.startsWith('drafts.')) ? _id : `drafts.${crypto.randomUUID()}`;

    console.log(`Processing Draft: ${title} | ID: ${finalId}`);

    // 2. Map Ordered Content for Sanity Portable Text
    const bodyBlocks = [];
    
    for (const item of content) {
      // Create a unique key for every block
      const blockKey = crypto.randomBytes(6).toString('hex');

      if (item.type === 'text') {
        bodyBlocks.push({
          _type: 'block',
          _key: blockKey, // CRITICAL
          style: 'normal',
          markDefs: [],
          children: [{ 
            _type: 'span', 
            _key: blockKey + '-span', // CRITICAL
            text: item.value 
          }]
        });
      } else if (item.type === 'image') {
        const buffer = Buffer.from(item.base64, 'base64');
        const asset = await sanity.assets.upload('image', buffer, {
          contentType: item.contentType || 'image/png',
          filename: `${finalId}-image`
        });
        
        bodyBlocks.push({
          _type: 'image',
          _key: blockKey, // CRITICAL
          asset: { _type: 'reference', _ref: asset._id }
        });
      }
    }

    // 3. Create or Replace in Sanity
    const result = await sanity.createOrReplace({
      _type: 'post', // Ensure this matches your Sanity Schema name
      _id: finalId,
      title: title,
      body: bodyBlocks
    });

    res.status(200).json({ 
        status: "success", 
        id: result._id,
        itemsProcessed: content.length 
    });

  } catch (err) {
    console.error("Sanity Push Error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Railway Server Online on Port ${PORT}`);
  console.log(`Ready for IDs like: drafts.${crypto.randomUUID()}`);
});

