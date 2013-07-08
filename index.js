var _shasum  = require('shasum')
var crypto  = require('crypto')
var trigger = require('level-trigger')
var pull    = require('pull-stream')
var pl      = require('pull-level')
var duplex  = require('duplex')

module.exports = function (db, merkleDb, opts) {

  opts = opts || {}
  var debug = opts.debug

  var log = !debug ? function () {} : console.log.bind(console)
  var hopts = opts.hash || {}

  var chunk = hopts.chunk   || 1
  var max = hopts.depth     || 4
  var alg = hopts.algorithm || 'sha1'
  var enc = hopts.encoding  || 'base64'

  var shasum = function (data) {
    return _shasum(data, alg, enc)
  }


  function encode (key, length) {
    var p = ((length || key.length) / chunk).toString(36)
  
    return p + '!' + key
  }

  function decode (key) {
    return key.split('!').pop()
  }

  if('string' === typeof merkleDb)
    merkleDb = db.sublevel(merkleDb)

  db.pre(function (data, add) {
    var v = JSON.stringify({key: data.key, value: data.value})
    //TODO: save full hashes, and then roll them down into keys
    //this will allow us to change the depth of the keys
    var hash = shasum(v).substring(0, max)
    add({key: encode(hash), value: v, type: 'put', prefix: merkleDb})
  })

  var triggerDb = 
  trigger(merkleDb, 'jobs', function (key) {
    var _key = key.key
    key = decode(_key)
    if(!key) return
    var k = encode(key)
    return _key.substring(0, _key.length - chunk) || undefined
  }, function (key, done) {
    log('level->', key)
    pull(
      pl.read(merkleDb, {min: key, max: key + '~', keys: false}),
      pull.collect(function (err, ary) {
        var value = shasum(ary.join(''))
        merkleDb.put(encode(decode(key)), value, done)
      })
    )
  })

  triggerDb.on('complete', function () {
    merkleDb.get('0!', function (err, hash) {
      if(hash)
        merkleDb.emit('drain', hash)
    })
  })

  //START: send the top hash,
  //when recieved a hash list,

  merkleDb.topHash = function (cb) {
    merkleDb.get('0!', function (err, value) {
      cb(err, '-' + value)
    })
  }

  function disunion (a, b) {
    return a.filter(function (x) {
      return !~b.indexOf(x)
    })
  }

  function getWithPrefix (prefix, cb) {
    var k = encode(prefix, prefix.length + chunk)
    //[prefix + '-' + hash, ...]
    pull(
      pl.read(merkleDb, {min: k, max: k+'~'}),
      pull.collect(function (err, ary) {
        cb(err, ary && ary.map(function (e) {
            return decode(e.key) + '-' + e.value
          })
        )
      })
    )
  }

  merkleDb.getWithPrefix = getWithPrefix

  function check(prefixedHash, cb) {
    var parts = prefixedHash.split('-')
    var prefix = parts[0]
    var hash   = parts[1]
    merkleDb.get(encode(prefix), function (err, value) {
      if(value === hash) {//hash matches, so do nothing
        cb(null, null)
      } else {
        getWithPrefix(prefix, cb)
      }
    })
  }

  merkleDb.check = function (hashes, cb) {
    getWithPrefix(hashes.prefix, function (err, _hashes) {
      cb(null, {prefix: _hashes.prefix, hashes: []})
    })
  }

  function toObject(hashes) {
    var obj = {}
    hashes.forEach(function (v) {
      var s = v.split('-')
      obj[s[0]] = s[1]
    })
    return obj
  }

  merkleDb.createStream = function (n) {
    var d = duplex()
    var synced = false
    var topHash = null
    function sendTop () {
      merkleDb.topHash(function (err, hashes) {
        d._data({top: true, hashes: [topHash = hashes]})
      })
    }

    function diff(prefix, myHashes, yourHashes) {
      var my = toObject(myHashes)
      var your = toObject(yourHashes)
      log('NODE'+n, 'COMPARE OUR HASHES')

      var extra = [], expand = []
      for(var k in my) {
        //do I have hashes that you do not?
        if(!your[k])
          extra.push(k)
        //do I have hashes that differ from your hash?
        else if(your[k] !== my[k])
          expand.push(k)
      }
      if(extra.length) {
        log('NODE'+n, 'must send all hashes prefixed with', extra)
        extra.forEach(function (prefix) {
          var k = encode(prefix, max)
          pull(
            pl.read(merkleDb, {min: k, max: k + '~', keys: false}),
            pull.drain(function (obj) {
              d._data(JSON.parse(obj))
            })
          )
        })
      }
      if(expand.length) {
        log('NODE', n, 'must send next layer of hashes:', expand)
        expand.forEach(function (_prefix) {
          merkleDb.getWithPrefix(_prefix, function (err, hashes) {
            log('NODE', n, 'hashes to send:', hashes)
            d._data({prefix: _prefix, hashes: hashes})
          })
        })
      }
      var missing = []
      for(var k in your) {
        //do I have hashes that you do not?
        if(!my[k])
          missing.push(k)
        //do I have hashes that differ from your hash?
      }

      if(missing.length)
        log('NODE', n, 'HAS MISSING HASHES', missing)
      else if(!expand.length && !extra.length && !synced) {
        log('***********************************')
        log('NODE', n, 'IS IN SYNC!')
        log('***********************************')
        d.emit('sync', topHash)
        if(!synced) {
          synced = true; sendTop()
        }

      }
    }

    d.on('_data', function (data) {
      if(data.hashes) {
        //check agains my hashes at same depth.
        log('NODE', n, 'received hashes', data)
        if(data.top)
          merkleDb.topHash(function (err, hash) {
            log('NODE', n, 'compare tophashes', hash, data.hashes[0])
            //d._data({top: true, hashes: [hash])
            diff('', [hash], data.hashes)
          })
        else {
          merkleDb.getWithPrefix(data.prefix, function (err, _hashes) {
            diff(data.prefix, _hashes, data.hashes)
            //are _hashes extra or 
          })
        }
      } else if(data.key) {
        log('NODE', n, 'recieved object', data)
        db.put(data.key, data.value, function (err) {
          log('NODE', n, 'replicated data')
        })
      }
    })
    
    sendTop()

    merkleDb.on('drain', function (hash) {
      log('NODE', n, 'drained', hash)
      sendTop()
    })

    return d
  }

  return merkleDb
}
