commands.info = {
  name: 'Jarvis',
  doc: 'Commands for working with Jarvis',
  author: 'Robert Kieffer <robert@broofa.com>'
};

commands.add({
  doc: 'Go to Jarvis home page',
  phrase: ['jarvis', 'J'],
  action: '/'
});

commands.add({
  doc: 'Reload jarvis plugins',
  phrase: ['Jreload'],
  action: '/reload'
});
