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
        // Build children with links
        const children = item.runs.map(run => {
          const span = {
            _type: 'span',
            _key: crypto.randomUUID(),
            text: run.text,
            marks: []
          };
          if (run.bold) span.marks.push('strong');
          if (run.link) {
            const linkKey = crypto.randomUUID();
            span.marks.push(linkKey);
            // We'll add the mark definition below
            return { span, link: run.link, linkKey };
          }
          return { span };
        });

        const block = {
          _type: 'block',
          _key: crypto.randomUUID(),
          style: item.style === 'NORMAL' ? 'normal' : 'h2',
          children: children.map(c => c.span),
          markDefs: children.filter(c => c.link).map(c => ({
            _type: 'link',
            _key: c.linkKey,
            href: c.link
          }))
        };
        finalBlocks.push(block);

      } else if (item.type === 'image') {
        const imageBuffer = Buffer.from(item.base64, 'base64');
        const asset = await sanity.assets.upload('image', imageBuffer);
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
      title: title,
      content: finalBlocks,
      subscriptionTier: 'enterprise',
      type: 'enterprise_research',
      publishDate: new Date().toISOString(),
      slug: { _type: 'slug', current: title.toLowerCase().replace(/\s+/g, '-') }
    });

    res.json({ success: true, id: doc._id });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.listen(8080);
