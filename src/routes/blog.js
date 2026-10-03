'use strict';
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const perPage = 9;
  const total = db.prepare("SELECT COUNT(*) c FROM blog_posts WHERE status = 'published'").get().c;
  const posts = db.prepare("SELECT id, title, slug, excerpt, cover_url, views, published_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?")
    .all(perPage, (page - 1) * perPage);
  res.json({ posts, page, pages: Math.max(1, Math.ceil(total / perPage)), total });
});

router.get('/:slug', (req, res) => {
  const post = db.prepare("SELECT * FROM blog_posts WHERE slug = ? AND status = 'published'").get(req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  db.prepare('UPDATE blog_posts SET views = views + 1 WHERE id = ?').run(post.id);
  const author = post.author_id ? db.prepare('SELECT name FROM users WHERE id = ?').get(post.author_id) : null;
  res.json({ post: { ...post, views: post.views + 1, author_name: author ? author.name : 'Editor' } });
});

module.exports = router;
