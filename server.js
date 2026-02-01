// ... (keep the top of your server.js initialization as is)

app.post('/api/publish', async (req, res) => {
  try {
    const { html, title, images } = req.body;
    console.log(`🚀 Processing: ${title}`);

    const blocks = htmlToBlocks(html, blockContentType, {
      parseHtml: (html) => new JSDOM(html).window.document
    });

    const doc = await sanity.create({
      _type: 'researchArticle',
      title: title,
      content: blocks,
      
      // 1. Mandatory Fields discovered in your JSON
      subscriptionTier: 'enterprise', // From your JSON
      type: 'enterprise_research',    // From your JSON
      publishDate: new Date().toISOString(),
      
      // 2. Slug is usually required for the Studio to open the doc
      slug: {
        _type: 'slug',
        current: title.toLowerCase().replace(/\s+/g, '-').slice(0, 200)
      },

      // 3. Placeholders for Required References (using IDs from your JSON)
      authors: [
        {
          _key: `author_${Date.now()}`,
          _type: 'reference',
          _ref: '56a1a926-f1b6-473f-b865-427f97ad84ed' // ID from your Inspect data
        }
      ],
      category: {
        _type: 'reference',
        _ref: '238a45f6-defd-4437-874e-9cc5d054d423' // ID from your Inspect data
      },

      // 4. Placeholder for AI Summary (to pass validation)
      aiSummary: "Draft generated from Google Docs. Please review."
    });

    console.log(`✅ Success! ID: ${doc._id}`);
    res.json({ success: true, id: doc._id });
  } catch (err) {
    // This is the most important part—if it fails, Railway logs will tell us exactly why
    console.error("FULL SANITY ERROR:", JSON.stringify(err, null, 2));
    res.status(500).json({ error: err.message });
  }
});

// ... (keep the rest of the server start logic)
