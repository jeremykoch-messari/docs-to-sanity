const express = require('express');
const { createClient } = require('@sanity/client');

const app = express();
app.use(express.json({ limit: '50mb' })); 

const client = createClient({
  projectId: '2bt0j8lu',
  dataset: 'production',
  token: 'skhAwXxe5rwEW10O9mNYCDUKuXBSlqbpgLb3qVip4qIXF2693V9wCXeZHNZrhFAK2HV0yseJrFw3PMIygzibpXZdnkX9Hu3YXE43KOCrtCtuuEj3Xoq1sViY4OSTCcjmiJWUl55DOoDQXvQlfezrHkw1HnIRVTslrepyY7plWsaPgoF0pTTT',
  apiVersion: '2023-05-03',
  useCdn: false
});

// Root route for Railway Health Check
app.get('/', (req, res) => {
  console.log("🟢 Health check hit at root /");
  res.send('Bridge is Online');
});

app.post('/api/publish', async (req, res) => {
  console.log("🚀 POST REQUEST RECEIVED at /api/publish");
  try {
    const { title, contentOrder } = req.body;
    
    if (!contentOrder || !Array.isArray(contentOrder)) {
      console.log("⚠️ Received empty or invalid contentOrder");
      return res.status(400).json({ error: "Missing contentOrder" });
    }

    console.log(`📝 Processing document: "${title}" with ${contentOrder.length} items.`);

    const blocks = [];
    for (let i = 0; i < contentOrder.length; i++) {
      const item = contentOrder[i];
      const baseKey = `k${i}_${Date.now()}`;

      if (item.type === 'text') {
        const markDefs = [];
        const spans = item.runs.map((run, idx) => {
          const sKey = `s${baseKey}${idx}`;
          const marks = [];
          if (run.bold) marks.push('strong');
          if (run.link) {
            marks.push(sKey);
            markDefs.push({ _key: sKey, _type: 'link', href: run.link });
          }
          return { _type: 'span', _key: sKey, text: run.text || '', marks };
        });

        blocks.push({
          _type: 'block',
          _key: baseKey,
          style: item.style?.includes('HEADING') ? 'h2' : 'normal',
          children: spans,
          markDefs
        });
      } else if (item.type === 'image') {
        console.log(`🖼️ Uploading image ${i}...`);
        const asset = await client.assets.upload('image', Buffer.from(item.base64, 'base64'));
        blocks.push({
          _type: 'image',
          _key: baseKey,
          asset: { _type: 'reference', _ref: asset._id }
        });
      }
    }

    const docId = `drafts.doc_${Date.now()}`;
    const doc = await client.create({
      _id: docId,
      _type: 'researchArticle',
      title: title,
      content: blocks,
      subscriptionTier: 'enterprise',
      type: 'enterprise_research',
      publishDate: new Date().toISOString(),
      slug: { _type: 'slug', current: title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() }
    });

    console.log(`✅ Draft created successfully: ${docId}`);
    res.json({ success: true, id: docId });

  } catch (err) {
    console.error('❌ SERVER ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Bridge live on Port ${PORT}`);
});
