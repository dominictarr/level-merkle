
var pull = require('pull-stream')
var pl   = require('pull-level')

var level   = require('level-test')()
var sublevel = require('level-sublevel')
var merkle   = require('../')

var hashes = require('./hashes.json')

var db = sublevel(level('test-merkle'))

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
        //console.log(JSON.stringify(ary, null, 2))
        t.deepEqual(ary, hashes)
        t.end()
        /*
        merkleDb.getWithPrefix('', function (err, ary) {
          console.log(err, ary)
          merkleDb.check('-NOTAHASH', function (err, ary) {
            console.log('CHECK', ary)
            pull(
              pull.values(ary),
              pull.asyncMap(merkleDb.check),
              pull.filter(),
              pull.flatten(),
              pull.collect(function (err, ary) {
                console.log(err, ary.sort())
                t.end()
              })
            )
          })
        })
        */
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

