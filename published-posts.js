'use strict';

// One definition of "the published article set" shared by the server and the
// validation scripts, so feeds, schema, sitemaps and checks never disagree.
// Editorial additions ship with the app bundle so they can be added without
// replacing the operator-maintained posts on Railway's persistent volume.
const editorialPosts = require('./data/editorial-guides-2026.json');

function publishedPosts(basePosts, now = Date.now()) {
  return [...basePosts, ...editorialPosts].filter(post =>
    post.slug && post.published_at && new Date(post.published_at).getTime() <= now
  );
}

module.exports = { publishedPosts, editorialPosts };
