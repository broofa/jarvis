commands.info = {
  name: 'Jarvis',
  doc: 'Commands for working with Jarvis',
  author: 'Robert Kieffer <robert@broofa.com>'
};

commands.add({
  doc: 'Go to Jarvis home page',
  phrase: ['jarvis', 'J'],
  action: '/',
  suggest: function() {
    // Return all command phrases as suggestions
    var suggestions = [];
    command.eachCommand(function(cmd) {
      suggestions.push(cmd.phrase);
    });

    return suggestions.sort();
  }
});
