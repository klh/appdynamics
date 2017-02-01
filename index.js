const Appdyn = require('./lib/appdynamics_scraper')
var client = new Appdyn({user: 'teamyousee@TDCAS', pass: 'Yousee1234'}, this.getData)

var dbFailedPages, dbJsErrors

// Get list of top pages with js errors

function getData () {
  console.log('ddd')
  client.getTopPages({sortBy: 'totalPageViewWithJavaScriptError', appId: 2702})
}
