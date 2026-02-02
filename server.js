const express = require('express');
const { createClient } = require('@sanity/client');

const app = express();
// Increase limit and ensure we handle JSON correctly
app.use(express.json({ limit: '100mb' }));

const client = createClient({
  projectId: '2bt0j8lu',
  dataset: 'production',
  token: 'skhAwXxe5rwEW10O9mNYCDUKuXBSlqbpgLb3qVip4qIXF2693V9wCXeZHNZrhFAK2HV0yseJrFw3PMIygzibpXZdnkX9Hu3YXE43KOCrtCtuuEj3Xoq1sViY4OSTCcjmiJWUl55DOoDQXvQlfezrHkw1HnIRVTslrepyY7plWsaPgoF0pTTT',
  apiVersion: '2023-05-03',
  useCdn: false
});

// PASS RAILWAY HEALTH CHECK
app.get('/', (req, res) => res.status(200).send('Bridge is Healthy'));

app.post('/api/publish', async (req, res) => {
  console.log("📥 Incoming Request...");
  
  try {
    // Dig for the data in case it's nested or malformed
    const title = req.body.title || "Untitled Document";
    const contentOrder = req.body.contentOrder || req.body.data || [];

    if (!Array.isArray(contentOrder) || contentOrder.length === 0) {
      console.log("⚠️ ERROR: No contentOrder array found in body. Keys received:", Object.keys(req.body));
      return res.status(200).json({ success: false, message: "Server alive, but no data received." });
    }

    console.log(`📦 Processing ${contentOrder.length} items for "${title}"`);

    const blocks = [];
    for (let i = 0; i < contentOrder.length; i++) {
      const item = contentOrder[i];
      const bKey = `block_${i}_${Date.now()}`;

      if (item.type === 'text') {
        const markDefs = [];
        const spans = (item.runs || []).map((run, idx) => {
          const sKey = `s_${bKey}_${idx}`;
          const marks = [];
          if (run.bold) marks.push('strong');
          if (run.link) {
            marks.push(sKey);
            markDefs.push({ _key: sKey, _type: 'link', href: run.link });
          }
          return { _type: 'span', _key: sKey, text: run.text || '', marks };
        });

        blocks.push({ _type: 'block', _key: bKey, style: 'normal', children: spans, markDefs });
      } else if (item.type === 'image' && item.base64) {
        console.log(`🖼️  Uploading Image ${i}...`);
        const asset = await client.assets.upload('image', Buffer.from(item.base64, 'base64'));
        blocks.push({ _type: 'image', _key: bKey, asset: { _type: 'reference', _ref: asset._id } });
      }
    }

    const result = await client.create({
      _id: `drafts.manual_${Date.now()}`,
      _type: 'researchArticle',
      title: title,
      content: blocks,
      subscriptionTier: 'enterprise',
      type: 'enterprise_research',
      publishDate: new Date().toISOString(),
      slug: { _type: 'slug', current: title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() }
    });

    console.log("✅ SUCCESS: Created Draft", result._id);
    res.json({ success: true, id: result._id });

  } catch (err) {
    console.error('❌ FATAL SERVER ERROR:', err.message);
    res.status(200).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Bridge live on Port ${PORT}`));
