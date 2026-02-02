const { createClient } = require('@sanity/client');

const app = express();
app.use(express.json({ limit: '100mb' })); 

const client = createClient({
  projectId: '2bt0j8lu',
@@ -15,7 +15,11 @@ const client = createClient({
app.post('/api/publish', async (req, res) => {
  try {
    const { title, contentOrder } = req.body;
    if (!contentOrder || !Array.isArray(contentOrder)) {
      return res.status(400).send("Invalid data format");
    }

    console.log(`🚀 Processing: ${title} (${contentOrder.length} items)`);

    const blocks = [];

@@ -26,26 +30,28 @@ app.post('/api/publish', async (req, res) => {
      if (item.type === 'text') {
        const markDefs = [];
        const spans = item.runs.map((run, idx) => {
          const spanKey = `s${baseKey}${idx}`;
          const marks = [];

          if (run.bold) marks.push('strong');
          if (run.link) {
            marks.push(spanKey);
            markDefs.push({ _key: spanKey, _type: 'link', href: run.link });
          }

          return { _type: 'span', _key: spanKey, text: run.text || '', marks };
        });

        blocks.push({
          _type: 'block',
          _key: baseKey,
          style: item.style?.includes('HEADING') ? 'h2' : 'normal',
          children: spans,
          markDefs
        });

      } else if (item.type === 'image') {
        // Upload the image asset and place it exactly in sequence
        const asset = await client.assets.upload('image', Buffer.from(item.base64, 'base64'));
        blocks.push({
          _type: 'image',
@@ -55,23 +61,28 @@ app.post('/api/publish', async (req, res) => {
      }
    }

    // Create as a Draft with a unique ID to prevent collisions
    const doc = await client.create({
      _id: `drafts.manual_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      _type: 'researchArticle',
      title: title,
      content: blocks,
      subscriptionTier: 'enterprise',
      type: 'enterprise_research',
      publishDate: new Date().toISOString(),
      slug: { _type: 'slug', current: title.toLowerCase().replace(/\s+/g, '-') }
    });

    console.log(`✅ Draft Created: ${doc._id}`);
    res.json({ success: true, id: doc._id });

  } catch (err) {
    console.error('❌ Server Error:', err.message);
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Bridge Online on Port ${PORT}`);
});
