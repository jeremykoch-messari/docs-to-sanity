const express = require('express');
const { createClient } = require('@sanity/client');

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
    if (!contentOrder) return res.status(400).send("No content received");

    const finalBlocks = [];

    for (const item of contentOrder) {
      const key = `k${Math.random().toString(36).substring(2, 9)}`;
      
      if (item.type === 'text') {
        const markDefs = [];
        const children = item.runs.map((run, idx) => {
          const marks = [];
          if (run.bold) marks.push('strong');
          if (run.link) {
            const linkKey = `link${key}${idx}`;
            marks.push(linkKey);
            markDefs.push({ _key: linkKey, _type: 'link', href: run.link });
          }
          return { _type: 'span', _key: `${key}${idx}`, text: run.text, marks: marks };
        });

        finalBlocks.push({
          _type: 'block',
          _key: key,
          style: 'normal',
          children: children,
          markDefs: markDefs
        });
      } else if (item.type === 'image') {
        const asset = await sanity.assets.upload('image', Buffer.from(item.base64, 'base64'));
        finalBlocks.push({
          _type: 'image',
          _key: key,
          asset: { _type: 'reference', _ref: asset._id }
        });
      }
    }

    const result = await sanity.create({
      _id: `drafts.doc_${Date.now()}`,
      _type: 'researchArticle',
      title: title,
      content: finalBlocks,
      subscriptionTier: 'enterprise',
      type: 'enterprise_research',
      publishDate: new Date().toISOString(),
      slug: { _type: 'slug', current: title.toLowerCase().replace(/\s+/g, '-') }
    });

    res.json({ success: true, id: result._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 8080);
