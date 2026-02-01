const { JSDOM } = require('jsdom');
const { htmlToBlocks } = require('@sanity/block-tools');
const { Schema } = require('@sanity/schema');

// Define a minimal schema so the tool knows what 'blocks' look like
const defaultSchema = Schema.compile({
  name: 'myBlog',
  types: [{
    type: 'object',
    name: 'blogPost',
    fields: [{
      title: 'Body',
      name: 'body',
      type: 'array',
      of: [{ type: 'block' }]
    }]
  }]
});
const blockContentType = defaultSchema.get('blogPost').fields.find(f => f.name === 'body').type;

app.post('/api/publish', async (req, res) => {
  const { html, title, images } = req.body;

  // Convert HTML to Sanity Blocks using the official tool
  const blocks = htmlToBlocks(html, blockContentType, {
    parseHtml: (html) => new JSDOM(html).window.document
  });

  // Create the document in Sanity
  try {
    const doc = await sanity.create({
      _type: 'researchArticle',
      title: title,
      content: blocks
    });
    res.json({ success: true, id: doc._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
