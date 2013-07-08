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
var util = require('./util')

tape('simple', function (t) {

  util.populate(db, 50)
  util.populate(db2, 51)

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
    util.consistent(s1, s2, t.end.bind(t))
  }
})

