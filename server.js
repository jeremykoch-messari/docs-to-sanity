// ... (inside your app.post logic, replacing the element loop)

elements.forEach(el => {
  const tagName = el.tagName.toLowerCase();
  
  if (tagName === 'img') {
    // ... (keep image logic)
  } else {
    const markDefs = [];
    const children = [];

    // Map HTML tag to Sanity Block Style
    const styleMap = { 'h1': 'h1', 'h2': 'h2', 'h3': 'h3', 'h4': 'h4', 'p': 'normal' };
    const blockStyle = styleMap[tagName] || 'normal';

    el.childNodes.forEach((node, idx) => {
      let marks = [];
      let text = node.textContent;
      let href = null;

      // Detect Formatting from HTML tags
      let currentNode = node;
      while (currentNode && currentNode !== el) {
        const tag = currentNode.tagName?.toLowerCase();
        if (tag === 'b' || tag === 'strong') marks.push('strong');
        if (tag === 'i' || tag === 'em') marks.push('em');
        if (tag === 'a') {
          href = currentNode.getAttribute('href');
          const linkKey = `link_${idx}_${Date.now()}`;
          markDefs.push({ _key: linkKey, _type: 'link', href });
          marks.push(linkKey);
        }
        currentNode = currentNode.parentNode;
      }

      if (text) {
        children.push({
          _type: 'span',
          _key: `span_${idx}_${Date.now()}`,
          text: text,
          marks: marks
        });
      }
    });

    blocks.push({
      _type: 'block',
      _key: `block_${Date.now()}_${Math.random()}`,
      style: blockStyle,
      children: children,
      markDefs: markDefs
    });
  }
});
