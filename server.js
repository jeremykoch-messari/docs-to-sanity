const express = require('express');
const { createClient } = require('@sanity/client');
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

app.post('/api/publish', async (req, res) => {
  try {
    const { title, contentOrder } = req.body;
    
    const finalBlocks = [];
    for (const item of contentOrder) {
      if (item.type === 'text') {
        const markDefs = [];
        const children = item.runs.map(run => {
          const marks = [];
          if (run.bold) marks.push('strong');
          if (run.link) {
            const key = `link${crypto.randomBytes(4).toString('hex')}`;
            marks.push(key);
            markDefs.push({ _key: key, _type: 'link', href: run.link });
          }
          return { _type: 'span', _key: crypto.randomUUID(), text: run.text, marks: marks };
        });

        finalBlocks.push({
          _type: 'block',
          _key: crypto.randomUUID(),
          style: 'normal',
          children: children,
          markDefs: markDefs
        });
      } else if (item.type === 'image') {
        const asset = await sanity.assets.upload('image', Buffer.from(item.base64, 'base64'));
        finalBlocks.push({
          _type: 'image',
          _key: crypto.randomUUID(),
          asset: { _type: 'reference', _ref: asset._id }
        });
      }
    }

    const doc = await sanity.create({
      _id: 'drafts.' + crypto.randomUUID(),
      _type: 'researchArticle',
      title: title,
      content: finalBlocks,
      subscriptionTier: 'enterprise',
      type: 'enterprise_research',
      publishDate: new Date().toISOString(),
      slug: { _type: 'slug', current: title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() }
    });

    res.json({ success: true, id: doc._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 8080);
