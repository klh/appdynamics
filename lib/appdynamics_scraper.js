/**
 * Created by kk on 01/02/2017.
 */

const agent = require('superagent-bluebird-promise')
const Promise = require('bluebird')
const low = require('lowdb')
const fs = require('safefs')
const _ = require('lodash')
const moment = require('moment')
const json2xls = require('json2xls')

var sessionCookies = false
const authUrlDef = 'https://tdcas.saas.appdynamics.com/controller/auth'

/**
 * AppDynamics Client Constructor
 * @param options (url, port, path, username, password)
 * @constructor
 */
var AppDynamics = function (options, callback) {

  this.auth(options, callback)
}
module.exports = AppDynamics

/**
 * getSessionCookie
 * authAndGetSessionCookie
 * @param callback
 */
AppDynamics.prototype.auth = function (options, callback) {
  /*
   *
   * {authUrl:"",user:"xx",pass:"yy"}
   *
   *
   * */

  var url = options.authUrl ? options.authUrl : authUrlDef
  console.log(url)
  agent
    .get(url)
    .auth(options.user, options.pass)
    .send('cookie', ' ')
    .query({ 'action': 'login' })
    .then(
      function (response) {
        if (!response.headers[ 'set-cookie' ]) {
          console.error('Oh n o! failed Auth!', response)
        } else {
          sessionCookies = response.headers[ 'set-cookie' ]
          console.info('authed successfully')
        }
      }
    ).then(callback)
    .catch(function (error) {console.log(error)})
}

/**
 * getTopPages
 * Provides a list of pages from appdynamics - here implemented with a sorter.
 * @param callback
 */
AppDynamics.prototype.getTopPages = function (options, callback) {
  /*
   *
   * {sortBy:"property",numToShow:21,appId:2121}
   *
   *
   * */
  if (!sessionCookies) {
    console.warn('no session found, call auth first')
    return
  }

  agent
    .post('https://tdcas.saas.appdynamics.com/controller/restui/pageList/getEumPageList')
    .send(
      {
        'applicationId'     : options.appId,
        'addId'             : null,
        'fetchSyntheticData': false,
        'timeRangeString'   : 'last_1_week|BEFORE_NOW|-1|-1|10080'
      }
    )
    .set('ADRUM', 'isAjax:true')
    .set('Cookie', sessionCookies)
    .set('Content-Type', 'application/json;charset=UTF-8')
    .set('Accept', 'application/json, text/plain, */*')
    .redirects(0)
    .then(
      function (res) {
        if (!res.ok) {
          console.log('Oh no! error')
        } else {
          console.log('yay got results - parings')

          var pluckedData = _.filter(
            res.body.pageList, function (o, t) {
              return o[ options.sortBy ] > 0
            }
          )
          pluckedData = _.orderBy(pluckedData, [ options.sortBy ], [ 'desc' ])
          var topData = _.slice(pluckedData, 0, options.numToShow)

          fs.writeFileSync('pages.json', JSON.stringify(pluckedData))
          fs.writeFileSync('pagesTop25.json', JSON.stringify(topData))

          console.log("wrote json files")

          //console.table(_.map(topData,['name','totalPageViewWithJavaScriptError']))

          var pluckedDataXls = json2xls(pluckedData);
          fs.writeFileSync('pages.xlsx', pluckedDataXls, 'binary');

          var topDataXls = json2xls(topData);
          fs.writeFileSync('pagesTop25.xlsx', topDataXls, 'binary');

        }
      }
    ).catch(function (error) {console.log(error)})
}

/**
 * businessTransactionsGetAll
 * Provides a list of all Business Transactions for a given application.
 * @param applicationName
 * @param callback
 */
AppDynamics.prototype.getTopAnalytics = function (options, callback) {

 console.info('getting errorpages (warning slow if size is high) numItems:', options.size)

  if (!sessionCookies) {
    console.warn('no session found, call auth first')
    return
  }

  var nowUnix = Date.now()
  var duration = moment.duration({ 'days': options.days })
  var thenUnix = moment().subtract(duration).valueOf()

// Get list of JS errors

  agent
    .post('https://tdcas.saas.appdynamics.com/controller/restui/analytics/searchJson/BROWSER_RECORD')
    .send({
      "query": {
        "filtered": {
          "query" : {
            "bool": {
              "must": [
                {
                  "match": {
                    "appkey": {
                      "query": "AD-AAB-AAC-GAU"
                    }
                  }
                }
              ]
            }
          },
          "filter": {
            "bool": {
              "must"  : [
                {
                  "range": {
                    "eventTimestamp": {
                      "to"  : nowUnix,
                      "from": thenUnix
                    }
                  }
                },
                {
                  "terms": {
                    "geocountry": [
                      "Denmark"
                    ]
                  }
                },
                {
                  "terms": {
                    "errortype": [
                      "script"
                    ]
                  }
                }
              ],
              "should": [
                {
                  "and": {
                    "filters": [
                      {
                        "terms": {
                          "pagename": options.pages
                        }
                      },
                      {
                        "terms": {
                          "pagetype": [
                            "BASE_PAGE"
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        }
      },
      "size" : options.size,
      "sort" : [
        {
          "eventTimestamp": {
            "order": "desc"
          }
        }
      ]
    })
    .set('ADRUM', 'isAjax:true')
    .set('Cookie', sessionCookies)
    .set('Content-Type', 'application/json;charset=UTF-8')
    .set('Accept', 'application/json, text/plain, */*')
    .redirects(0)
    .then(function (res) {
      if (!res.ok) {
        console.log('Oh no! error')
      } else {

        var data = JSON.parse(res.body.rawResponse).hits.hits
        data = _.map(data,'_source');
        console.log(JSON.stringify(data))
        var groupedData = _.groupBy(data, 'pageurl');

        fs.writeFileSync('jsErrorsFullByPagename.json', JSON.stringify(groupedData))

        var groupedDataXls = json2xls(groupedData);
        fs.writeFileSync('jsErrorsFullByPagename.xlsx', groupedDataXls, 'binary');

        fs.writeFileSync('jsErrorsFull.json', JSON.stringify(data))

        var dataXls = json2xls(data);
        fs.writeFileSync('jsErrorsFull.xlsx', dataXls, 'binary');

      }
    }).catch(function (error) {console.log(error)})

}

/**
 * tiersGetByName
 * Provides tier information for a given tier.
 * @param applicationName
 * @param tierName
 * @param callback
 */
AppDynamics.prototype.tiersGetByName = function (applicationName, tierName, callback) {
  var url = this.connection + 'applications/' + applicationName + '/tiers/' + tierName + this.outputType
  agent.get(url, responseHandler.bind(this, callback))
}
