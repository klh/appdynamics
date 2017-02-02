const Appdyn = require('./lib/appdynamics_scraper')
var client = new Appdyn({user: 'USERNAME@HOST', pass: 'PASSWORD'}, getData)

// Get list of top pages with js errors

function getData () {
  client.getTopPages({sortBy: 'totalPageViewWithJavaScriptError', appId: 2702,numToShow:25})
  client.getTopAnalytics({days: 5, size: 10,pages:[
                            "selvbetjening.yousee.dk",
                            "selvbetjening.yousee.dk/regninger",
                            "selvbetjening.yousee.dk/tv",
                            "selvbetjening.yousee.dk/regninger/forbrugsdetaljer/downloadpdf",
                            "selvbetjening.yousee.dk/regninger/forbrugsdetaljer",
                            "selvbetjening.yousee.dk/mobil",
                            "selvbetjening.yousee.dk/indstillinger",
                            "selvbetjening.yousee.dk/bredbaand",
                            "selvbetjening.yousee.dk/fastnet",
                            "selvbetjening.yousee.dk/fordele",
                            "selvbetjening.yousee.dk/mobiltbredbaand"
                          ]})
}
