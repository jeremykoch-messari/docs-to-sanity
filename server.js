const express = require('express');
const crypto = require('crypto'); // Native Node.js module
const { createClient } = require('@sanity/client');

const app = express();
app.use(express.json({ limit: '50mb' })); // Large limit for images

const sanity = createClient({
  projectId: 'your_id',
  dataset: 'production',
  token: process.env.SANITY_TOKEN,
  apiVersion: '2026-02-02',
  useCdn: false
});

app.post('/publish', async (req, res) => {
  try {
    const { _id, title, content } = req.body;

    // Validate ID structure: drafts.[uuid]
    let finalId = _id;
    if (!finalId || !finalId.startsWith('drafts.')) {
      finalId = `drafts.${crypto.randomUUID()}`;
    }

    console.log(`Processing ${title} with ID: ${finalId}`);

    // This is where you map the ordered 'content' array into Sanity blocks
    // Text items become blocks, Image items become assets
    const sanityDoc = {
      _type: 'post',
      _id: finalId,
      title: title,
      body: content.map(item => {
        if (item.type === 'text') {
          return { _type: 'block', children: [{ _type: 'span', text: item.value }] };
        }
        // Image logic would go here (uploading asset then referencing it)
        return null; 
      }).filter(Boolean)
    };

    await sanity.createOrReplace(sanityDoc);
    
    res.status(200).json({ status: "success", id: finalId });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.listen(process.env.PORT || 3000);
