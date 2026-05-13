const path = require('path');
const safelist = require('./dist/safelist.json');

module.exports = {
  content: ['dist/index.html', 'dist/**/*.js'],
  css: ['dist/assets/index-Dgh67t4q.css'],
  safelist,
  output: 'dist/assets/purged'
};
