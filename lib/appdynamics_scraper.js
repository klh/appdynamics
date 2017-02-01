/**
 * Created by kk on 01/02/2017.
 */

const agent = require('superagent-bluebird-promise')
const Promise = require('bluebird')
const low = require('lowdb')
const fs = require('safefs')
const _ = require('lodash')
var sessionCookies = false
var dbFailedPages;
const authUrlDef = 'https://tdcas.saas.appdynamics.com/controller/auth'

var responseHandler = function (callback, err, response) {
  console.log('iran')
  if (err) {
    callback(err, response)
    console.warn('error in response', arguments)
  } else {
    if (response.statusCode >= 400) {
      callback(response.statusCode, response)
    } else {
      console.warn('statuscode ', response.statusCode, ' error', arguments)
      callback(err, response.body)
    }
  }
}

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
      function (err, response) {
      console.log(err)
        if (err || !response.ok) {
          console.error('Oh n o! failed Auth!', err)
        } else {
          sessionCookies = response.headers[ 'set-cookie' ]
          console.info('auth with: ' + JSON.stringify(sessionCookies))
          responseHandler.bind(this.response, callback)
        }
        responseHandler.bind(this, callback)
      }
    ).then(
    function(res){console.log('-----res')})
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
    {'applicationId': options.appId,
      'addId': null,
      'fetchSyntheticData': false,
      'timeRangeString': 'last_1_week|BEFORE_NOW|-1|-1|10080'}
    )
    .set('ADRUM', 'isAjax:true')
    .set('Cookie', sessionCookies)
    .set('Content-Type', 'application/json;charset=UTF-8')
    .set('Accept', 'application/json, text/plain, */*')
    .redirects(0)
    .end(
      function (err, res) {
        if (err || !res.ok) {
          console.log('Oh no! error')
        } else {
          console.log('yay got ' + JSON.stringify(res.body))

          var pluckedData = _.filter(
            res.body.pageList, function (o, t) {
              return o[ options.sortBy ] > 0
            }
          )

          console.log(pluckedData)
          fs.writeFileSync('pages.json', JSON.stringify(res.body))
          dbFailedPages = low('pages.json')
        }
      }
    )
}

/**
 * businessTransactionsGetAll
 * Provides a list of all Business Transactions for a given application.
 * @param applicationName
 * @param callback
 */
AppDynamics.prototype.getTopAnalytics = function (numToGet, numToShow, callback) {

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
