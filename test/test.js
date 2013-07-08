
var pull = require('pull-stream')
var pl   = require('pull-level')

var level   = require('level-test')()
var sublevel = require('level-sublevel')
var merkle   = require('../')

var hashes = require('./hashes.json')

var db = sublevel(level('test-merkle'))

//I've since changed the default options,
//but these will work with the results I was testing against initially.

var hashOpts = {
  encoding: 'hex',
  algorithm: 'sha1',
  chunk: 2,
  depth: 10
}

var merkleDb = merkle(db, 'merkle', {hash: hashOpts})

var tape = require('tape')

tape('simple', function (t) {

  merkleDb.on('drain', function (hash) {
    t.equal(hash, 'feffb691271905d52c792a37fa9a88f623258932')

    pull(
      pl.read(merkleDb, {min: '0!', max: '4!', keys: false}),
      pull.collect(function (err, ary) {
        if(err) throw err
        t.deepEqual(ary, hashes)
        t.end()
      })
    )
  })

  pull(
    pull.count(100),
    pull.take(50),
    pull.map(function (i) {
      return {key: ''+i, value: (i * 13725).toString(36)}
    }),
    pl.write(db)
  )

})

