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
    // LOG EVERYTHING to see what is actually arriving
    console.log('--- DATA RECEIVED ---');
    console.log('Keys present in body:', Object.keys(req.body));

    // Try to find the data even if the name is slightly different
    const data = req.body.contentOrder || req.body.data || req.body;
    
    if (!data || !Array.isArray(data)) {
      console.error('❌ Data is not an array. Value:', typeof data);
      return res.status(400).json({ error: "Data format error. Received: " + typeof data });
    }

    const finalBlocks = [];
    for (const item of data) {
      if (item.type === 'text' && item.runs) {
        const children = item.runs.map(run => {
          const span = { _type: 'span', _key: crypto.randomUUID(), text: run.text || '', marks: [] };
          if (run.bold) span.marks.push('strong');
          if (run.link) {
            const linkKey = crypto.randomUUID();
            span.marks.push(linkKey);
            return { span, link: run.link, linkKey };
          }
          return { span };
        });

        finalBlocks.push({
          _type: 'block',
          _key: crypto.randomUUID(),
          style: (item.style && item.style.includes('HEADING')) ? 'h2' : 'normal',
          children: children.map(c => c.span),
          markDefs: children.filter(c => c.link).map(c => ({
            _type: 'link',
            _key: c.linkKey,
            href: c.link
          }))
        });
      } else if (item.type === 'image' && item.base64) {
        const asset = await sanity.assets.upload('image', Buffer.from(item.base64, 'base64'));
        finalBlocks.push({
          _type: 'image',
          _key: crypto.randomUUID(),
          asset: { _type: 'reference', _ref: asset._id }
        });
      }
    }

    const doc = await sanity.createOrReplace({
      _id: 'drafts.' + crypto.randomUUID(),
      _type: 'researchArticle',
      title: req.body.title || 'Untitled Research',
      content: finalBlocks,
      subscriptionTier: 'enterprise',
      type: 'enterprise_research',
      publishDate: new Date().toISOString(),
      slug: { _type: 'slug', current: (req.body.title || 'report').toLowerCase().replace(/\s+/g, '-') }
    });

    console.log('✅ SUCCESS! ID:', doc._id);
    res.json({ success: true, id: doc._id });

  } catch (err) {
    console.error('❌ CRASH:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 8080);
