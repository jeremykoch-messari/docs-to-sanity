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

app.post('/api/publish', async (req, res) => {
  try {
    const { title, contentOrder } = req.body;
    if (!contentOrder) return res.status(400).send("No data");

    const blocks = [];

    for (let i = 0; i < contentOrder.length; i++) {
      const item = contentOrder[i];
      const baseKey = `k${i}_${Date.now()}`;

      if (item.type === 'text') {
        const markDefs = [];
        const spans = item.runs.map((run, idx) => {
          const mKey = `${baseKey}_${idx}`;
          const marks = [];
          
          if (run.bold) marks.push('strong');
          if (run.link) {
            marks.push(mKey);
            markDefs.push({ _key: mKey, _type: 'link', href: run.link });
          }
          
          return { _type: 'span', _key: mKey, text: run.text || '', marks };
        });

        blocks.push({
          _type: 'block',
          _key: baseKey,
          style: item.style && item.style.includes('HEADING') ? 'h2' : 'normal',
          children: spans,
          markDefs
        });
      } else if (item.type === 'image') {
        const asset = await client.assets.upload('image', Buffer.from(item.base64, 'base64'));
        blocks.push({
          _type: 'image',
          _key: baseKey,
          asset: { _type: 'reference', _ref: asset._id }
        });
      }
    }

    const doc = await client.create({
      _id: `drafts.doc_${Date.now()}`,
      _type: 'researchArticle',
      title: title || 'Untitled',
      content: blocks,
      subscriptionTier: 'enterprise',
      type: 'enterprise_research',
      publishDate: new Date().toISOString(),
      slug: { _type: 'slug', current: (title || 'report').toLowerCase().replace(/\s+/g, '-') }
    });

    res.json({ success: true, id: doc._id });
  } catch (err) {
    console.error('SERVER ERROR:', err.message);
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
