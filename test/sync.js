var tape = require('tape')
var level = require('level-test')()
var sublevel = require('level-sublevel')
var through = require('through')
var Merkle = require('../')

tape(function (t) {
  t.plan(1)
  var db = {
    a: sublevel(level('a', { valueEncoding: 'json' })),
    b: sublevel(level('b', { valueEncoding: 'json' }))
  }
  
  var merkle = {
    a: Merkle(db.a, 'merkle', { debug: true }),
    b: Merkle(db.b, 'merkle', { debug: true })
  }
  
  db.a.batch([
    { type: 'put', key: 'def', value: [4,5,6] }
  ], ready)
  
  db.b.batch([
    { type: 'put', key: 'abc', value: [1,2,3] },
    { type: 'put', key: 'hij', value: [7,8,9] }
  ], ready);
  
  var pending = 2;
  function ready () {
    if (--pending !== 0) return
    
    var sa = merkle.a.createStream()
    var sb = merkle.b.createStream()
    
    sa.on('sync', function () {
      var rows = []
      db.a.createReadStream()
        .pipe(through(write, end))
      ;
      function write (row) { rows.push(row) }
      function end () {
        t.deepEqual(rows, [
          { key: 'abc', value: [1,2,3] },
          { key: 'def', value: [4,5,6] },
          { key: 'hij', value: [7,8,9] }
        ])
      }
    })
    sa.pipe(sb).pipe(sa)
  }
})
