var pull = require('pull-stream')
var pl   = require('pull-level')

exports.populate = function (db, n, key, mult, done) {
  key = key || ''
  mult = mult || 13725
  pull(
    pull.count(Math.max(100, n)),
    pull.take(n),
    pull.map(function (i) {
      return {key: key+i, value: (i * mult).toString(36)}
    }),
    pl.write(db, {windowSize: 1000, windowTime: 50}, done)
  )
}

exports.consistent = 
function (s1, s2, end) {
  var h1, h2
  function check () {
    if(h1 === h2) end()
  }
  s1.on('sync', function (hash) {
    h1 = hash; check()
  })
  s1.on('sync', function (hash) {
    h2 = hash; check()
  })
}


