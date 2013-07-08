
var pull = require('pull-stream')
var pl   = require('pull-level')

var level   = require('level-test')()
var sublevel = require('level-sublevel')
var merkle   = require('../')

var hashes = require('./hashes.json')

var db = sublevel(level('test-merkle-rep1'))
var merkleDb = merkle(db, 'merkle')

var db2 = sublevel(level('test-merkle-rep2'))
var merkleDb2 = merkle(db2, 'merkle')

var tape = require('tape')

function disunion (a, b) {
  return a.filter(function (x) {
    return !~b.indexOf(x)
  })
}

tape('simple', function (t) {

  pull(
    pull.count(100),
    pull.take(50),
    pull.map(function (i) {
      return {key: ''+i, value: (i * 13725).toString(36)}
    }),
    pl.write(db)
  )

  pull(
    pull.count(100),
    pull.take(51),
    pull.map(function (i) {
      return {key: ''+i, value: (i * 13725).toString(36)}
    }),
    pl.write(db2)
  )

  var n = 2

  merkleDb.on('drain', next)
  merkleDb2.on('drain', next)

  function next () {
    if(--n) return

    //lets say that I am db2
    //assume we've already checked top hashes, and they differ.
    //then we get all keys with the next layer of prefixes.

    var s1 = merkleDb.createStream(1)
    var s2 = merkleDb2.createStream(2)

    s1.pipe(s2).pipe(s1)

    var h1, h2
    s1.on('sync', function (hash) {
      h1 = hash
      if(h1 == h2)
        t.end()
    })

    s1.on('sync', function (hash) {
      h2 = hash
      if(h1 == h2)
        t.end()
    })

  }
})

