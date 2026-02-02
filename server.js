const express = require('express');
const { createClient } = require('@sanity/client');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Using the credentials you provided directly to rule out Railway Variable errors
const sanity = createClient({
  projectId: '2bt0j8lu',
  dataset: 'production',
  token: 'skhAwXxe5rwEW10O9mNYCDUKuXBSlqbpgLb3qVip4qIXF2693V9wCXeZHNZrhFAK2HV0yseJrFw3PMIygzibpXZdnkX9Hu3YXE43KOCrtCtuuEj3Xoq1sViY4OSTCcjmiJWUl55DOoDQXvQlfezrHkw1HnIRVTslrepyY7plWsaPgoF0pTTT',
  apiVersion: '2023-05-03',
  useCdn: false
});

app.post('/api/publish', async (req, res) => {
  try {
    const { title } = req.body;
    console.log('🚀 TESTING CONNECTION FOR: ' + title);

    // SIMPLEST POSSIBLE CREATE: No custom ID, no Drafts, no metadata
    const doc = await sanity.create({
      _type: 'researchArticle',
      title: title + ' (Connection Test)'
    });

    console.log('✅ SUCCESS! Document ID: ' + doc._id);
    res.json({ success: true, id: doc._id });
  } catch (err) {
    console.error('❌ STILL FAILING: ' + err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('Bridge live on ' + PORT));
